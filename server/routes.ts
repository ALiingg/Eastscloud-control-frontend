import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, regenerateSession, checkRateLimit, recordFailedAttempt, clearFailedAttempts } from "./auth";
import { api } from "@shared/routes";
import { loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { exec as execCb } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execCb);

const SALT_ROUNDS = 12;

function guacBaseUrl() {
  return (process.env.GUAC_BASE_URL || "http://192.168.2.44:8088/guacamole").replace(/\/$/, "");
}

async function getGuacAuthToken() {
  const username = process.env.GUAC_USERNAME || "guacadmin";
  const password = process.env.GUAC_PASSWORD || "guacadmin";

  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const r = await fetch(`${guacBaseUrl()}/api/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Guacamole auth failed: ${r.status} ${detail}`);
  }

  return r.json() as Promise<{ authToken: string; dataSource?: string }>;
}

async function guacRequest(path: string, init?: RequestInit) {
  const auth = await getGuacAuthToken();
  const dataSource = process.env.GUAC_DATASOURCE || auth.dataSource || "postgresql";
  const sep = path.includes("?") ? "&" : "?";
  const url = `${guacBaseUrl()}${path}${sep}token=${encodeURIComponent(auth.authToken)}`;

  const r = await fetch(url, init);
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Guacamole request failed: ${r.status} ${detail}`);
  }
  return r.json();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  setupAuth(app);

  // === Auth Routes (public) ===
  app.post("/api/auth/register", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const rateCheck = checkRateLimit(ip);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          message: `Too many attempts. Try again in ${rateCheck.retryAfter} seconds.`
        });
      }

      const { username, password } = registerSchema.parse(req.body);

      const userCount = await storage.getUserCount();
      if (userCount > 0) {
        return res.status(403).json({ message: "Registration is closed. Only one admin account is allowed." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      try {
        const user = await storage.createUser({ username, password: hashedPassword });

        req.session.userId = user.id;
        req.session.username = user.username;
        await regenerateSession(req);

        clearFailedAttempts(ip);
        res.status(201).json({ id: user.id, username: user.username });
      } catch (dbErr: any) {
        if (dbErr.code === "23505") {
          return res.status(409).json({ message: "Username already exists" });
        }
        throw dbErr;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const rateCheck = checkRateLimit(ip);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          message: `Too many attempts. Try again in ${rateCheck.retryAfter} seconds.`
        });
      }

      const { username, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        recordFailedAttempt(ip);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        recordFailedAttempt(ip);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = (user as any).role || "normal";
      await regenerateSession(req);

      clearFailedAttempts(ip);
      res.json({ id: user.id, username: user.username, role: req.session.role });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("pmcenter.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session && req.session.userId) {
      return res.json({ id: req.session.userId, username: req.session.username, role: req.session.role || "normal" });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  app.get("/api/auth/status", async (_req, res) => {
    const count = await storage.getUserCount();
    res.json({ hasAdmin: count > 0 });
  });

  const OPENCLAW_USAGE_CACHE_MS = 3 * 60 * 1000;
  let openclawUsageCache: { at: number; payload: any } | null = null;

  app.get("/api/openclaw/usage", async (_req, res) => {
    try {
      const now = Date.now();
      if (openclawUsageCache && now - openclawUsageCache.at < OPENCLAW_USAGE_CACHE_MS) {
        return res.json(openclawUsageCache.payload);
      }

      const { stdout: statusJsonRaw } = await execAsync("openclaw gateway call status --json");
      const statusObj = JSON.parse(statusJsonRaw);
      const recent = statusObj?.sessions?.recent || [];
      const current = recent.find((s: any) => String(s.key || "").includes("agent:main:dingtalk:direct"))
        || recent.find((s: any) => String(s.key || "").includes("agent:main:main"))
        || recent[0]
        || null;

      let weekUsageTokens = null;
      let totalUsageTokens = null;
      try {
        const { stdout: costRaw } = await execAsync("openclaw gateway usage-cost --json");
        const costObj = JSON.parse(costRaw);
        const daily = Array.isArray(costObj?.daily) ? costObj.daily : [];
        const last7 = daily.slice(-7);
        weekUsageTokens = last7.reduce((sum: number, d: any) => sum + Number(d?.totalTokens || 0), 0);
        totalUsageTokens = Number(costObj?.totals?.totalTokens || 0) || null;
      } catch {
        weekUsageTokens = null;
        totalUsageTokens = null;
      }

      let weekLeftPercent: number | null = null;
      try {
        const { stdout: modelsRaw } = await execAsync("openclaw models");
        const lines = String(modelsRaw || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const usageLines = lines.filter((l) => /usage:/i.test(l));
        const lastUsageLine = usageLines[usageLines.length - 1] || lines[lines.length - 1] || "";

        // e.g. "- openai-codex usage: 5h 87% left ... · Week 17% left ..."
        const weekMatch = lastUsageLine.match(/Week\s+(\d+(?:\.\d+)?)%\s+left/i);
        if (weekMatch) {
          weekLeftPercent = Number(weekMatch[1]);
        }
      } catch {
        weekLeftPercent = null;
      }

      const payload = {
        contextUsedK: current?.totalTokens ? Math.round(Number(current.totalTokens) / 1000) : null,
        contextTotalK: current?.contextTokens ? Math.round(Number(current.contextTokens) / 1000) : null,
        contextPercent: typeof current?.percentUsed === "number" ? Number(current.percentUsed) : null,
        cachePercent: current?.totalTokens ? Math.max(0, Math.min(100, Math.round((Number(current.cacheRead || 0) / Number(current.totalTokens)) * 100))) : null,
        weekLeftPercent,
        weekUsageTokens,
        totalUsageTokens,
        raw: current?.key || "",
      };

      openclawUsageCache = { at: now, payload };
      res.json(payload);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to read OpenClaw usage", detail: String(e?.message || e) });
    }
  });

  app.get("/api/server-status", async (_req, res) => {
    const targets = [
      { name: "Linux (ubuntu-main)", host: "127.0.0.1", port: 22, os: "linux" },
      { name: "Windows (ROGStrix)", host: "eastscloud.synology.me", port: 33333, os: "windows" },
    ];

    const checks = await Promise.all(targets.map(async (t) => {
      try {
        await execAsync(`timeout 2 bash -lc 'cat < /dev/null > /dev/tcp/${t.host}/${t.port}'`);
        return { ...t, online: true };
      } catch {
        return { ...t, online: false };
      }
    }));

    res.json({ updatedAt: new Date().toISOString(), servers: checks });
  });

  // === Protect all /api routes below with auth ===
  app.use("/api/services", requireAuth);
  app.use("/api/documents", requireAuth);
  app.use("/api/otp-secrets", requireAuth);
  app.use("/api/openclaw", requireAuth);
  app.use("/api/server-status", requireAuth);
  app.use("/api/guac", requireAuth);

  // User role management (admin only)
  app.get("/api/users", async (req, res) => {
    if ((req.session as any).role === "otp-only") {
      return res.status(403).json({ message: "权限不足" });
    }
    try {
      const users = await storage.getUsers();
      // 不返回密码
      const safeUsers = users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }));
      res.json(safeUsers);
    } catch (e: any) {
      res.status(500).json({ message: "获取用户列表失败: " + String(e?.message || e) });
    }
  });

  app.patch("/api/users/:id/role", async (req, res) => {
    if ((req.session as any).role === "otp-only") {
      return res.status(403).json({ message: "权限不足" });
    }
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    if (!["normal", "otp-only"].includes(role)) {
      return res.status(400).json({ message: "无效的角色" });
    }
    try {
      await storage.updateUserRole(userId, role);
      res.json({ message: "角色已更新" });
    } catch (e: any) {
      res.status(500).json({ message: "更新失败: " + String(e?.message || e) });
    }
  });

  // === Seed ===
  async function seedDatabase() {
    try {
      const existingServices = await storage.getServices();
      if (existingServices.length === 0) {
        await storage.createService({
          title: "Synology NAS",
          url: "http://synology.local:5000",
          icon: "Server",
          category: "file_access",
          description: "Personal file access and management",
        });
        await storage.createService({
          title: "GitLab",
          url: "https://gitlab.example.com",
          icon: "GitBranch",
          category: "code",
          description: "Source code repository",
        });
      }

      const existingDocs = await storage.getDocuments();
      if (existingDocs.length === 0) {
        await storage.createDocument({
          title: "Server Deployment Guide",
          content: "# Server Deployment\n\n1. Update packages\n2. Install Docker\n3. Run compose up",
        });
        await storage.createDocument({
          title: "Network Config",
          content: "IP Range: 192.168.1.x\nGateway: 192.168.1.1\nDNS: 1.1.1.1",
        });
      }

      const existingOtp = await storage.getOtpSecrets();
      if (existingOtp.length === 0) {
        await storage.createOtpSecret({
          issuer: "GitHub",
          account: "user@example.com",
          secret: "JBSWY3DPEHPK3PXP",
        });
      }
    } catch (e) {
      console.error("Seeding failed", e);
    }
  }
  seedDatabase();

  // Guacamole API proxy (for web-based SSH/RDP management)
  app.get("/api/guac/status", async (_req, res) => {
    try {
      const auth = await getGuacAuthToken();
      res.json({ ok: true, dataSource: process.env.GUAC_DATASOURCE || auth.dataSource || "postgresql", baseUrl: guacBaseUrl() });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: String(e?.message || e) });
    }
  });

  app.get("/api/guac/connections", async (_req, res) => {
    try {
      const auth = await getGuacAuthToken();
      const ds = process.env.GUAC_DATASOURCE || auth.dataSource || "postgresql";
      const data = await guacRequest(`/api/session/data/${ds}/connections`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to list Guacamole connections", detail: String(e?.message || e) });
    }
  });

  app.post("/api/guac/connections", async (req, res) => {
    try {
      const auth = await getGuacAuthToken();
      const ds = process.env.GUAC_DATASOURCE || auth.dataSource || "postgresql";

      const {
        name,
        protocol,
        hostname,
        port,
        username,
        password,
        ignoreCert,
      } = req.body || {};

      if (!name || !protocol || !hostname || !port) {
        return res.status(400).json({ message: "name, protocol, hostname, port are required" });
      }

      const payload: any = {
        parentIdentifier: "ROOT",
        name,
        protocol,
        parameters: {
          hostname: String(hostname),
          port: String(port),
          username: username ? String(username) : "",
          password: password ? String(password) : "",
          security: protocol === "rdp" ? "any" : "",
          "ignore-cert": protocol === "rdp" ? (ignoreCert === false ? "" : "true") : "",
        },
        attributes: {
          "max-connections": "",
          "max-connections-per-user": "",
          weight: "",
          "failover-only": "",
          "guacd-port": "4822",
          "guacd-encryption": "",
        },
      };

      const created = await guacRequest(`/api/session/data/${ds}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create Guacamole connection", detail: String(e?.message || e) });
    }
  });

  // Services
  app.get(api.services.list.path, async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.get(api.services.get.path, async (req, res) => {
    const service = await storage.getService(Number(req.params.id));
    if (!service) return res.status(404).json({ message: "Not found" });
    res.json(service);
  });

  app.post(api.services.create.path, async (req, res) => {
    try {
      const input = api.services.create.input.parse(req.body);
      const created = await storage.createService(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.put(api.services.update.path, async (req, res) => {
    try {
      const input = api.services.update.input.parse(req.body);
      const updated = await storage.updateService(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.delete(api.services.delete.path, async (req, res) => {
    const success = await storage.deleteService(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  });

  // Documents
  app.get(api.documents.list.path, async (req, res) => {
    const docs = await storage.getDocuments();
    res.json(docs);
  });

  app.get(api.documents.get.path, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  });

  app.post(api.documents.create.path, async (req, res) => {
    try {
      const input = api.documents.create.input.parse(req.body);
      const created = await storage.createDocument(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.put(api.documents.update.path, async (req, res) => {
    try {
      const input = api.documents.update.input.parse(req.body);
      const updated = await storage.updateDocument(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.delete(api.documents.delete.path, async (req, res) => {
    const success = await storage.deleteDocument(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  });

  // OTP Secrets
  app.get(api.otpSecrets.list.path, async (_req, res) => {
    const eastsBase = process.env.EASTSCLOUD_BACKEND_URL;

    // If EastsCloud backend is configured, use its OTP runtime logic from MySQL.
    if (eastsBase) {
      try {
        const r = await fetch(`${eastsBase.replace(/\/$/, "")}/api/eastscloud-control/allControlCodes`);
        if (r.ok) {
          const json: any = await r.json();
          const data = json?.data || {};
          const mapped = Object.entries<any>(data).map(([app, v], idx) => ({
            id: -(idx + 1),
            issuer: app,
            account: `TTL ${v?.ttl ?? "-"}s`,
            secret: "",
            runtimeCode: v?.code ?? "------",
            ttl: v?.ttl ?? 0,
            source: "eastscloud",
          }));
          return res.json(mapped);
        }
      } catch (e) {
        console.warn("EastsCloud OTP proxy failed, fallback to local secrets:", e);
      }
    }

    const secrets = await storage.getOtpSecrets();
    res.json(secrets);
  });

  app.get(api.otpSecrets.get.path, async (req, res) => {
    const secret = await storage.getOtpSecret(Number(req.params.id));
    if (!secret) return res.status(404).json({ message: "Not found" });
    res.json(secret);
  });

  app.post(api.otpSecrets.create.path, async (req, res) => {
    try {
      const input = api.otpSecrets.create.input.parse(req.body);
      const created = await storage.createOtpSecret(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  // One-click sync local OTP secrets -> EastsCloud MySQL backend
  app.post("/api/otp-secrets/sync-eastscloud", async (_req, res) => {
    const eastsBase = process.env.EASTSCLOUD_BACKEND_URL;
    if (!eastsBase) return res.status(400).json({ message: "EASTSCLOUD_BACKEND_URL not configured" });

    try {
      const local = await storage.getOtpSecrets();
      const payload = local.map((s) => ({
        account: s.account,
        accountId: `${s.issuer}:${s.account}`,
        algorithm: "SHA1",
        appname: s.issuer,
        digits: 6,
        interval: 30,
        issuer: s.issuer,
        platform: "central-hub",
        secret: s.secret,
        uuid: `central-${s.id}`,
      }));

      const r = await fetch(`${eastsBase.replace(/\/$/, "")}/api/eastscloud-control/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await r.text();
      if (!r.ok) return res.status(500).json({ message: "sync failed", detail: txt });
      return res.json({ synced: payload.length, result: txt });
    } catch (e: any) {
      return res.status(500).json({ message: "sync failed", detail: String(e?.message || e) });
    }
  });

  app.put(api.otpSecrets.update.path, async (req, res) => {
    try {
      const input = api.otpSecrets.update.input.parse(req.body);
      const updated = await storage.updateOtpSecret(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.delete(api.otpSecrets.delete.path, async (req, res) => {
    const success = await storage.deleteOtpSecret(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  });

  return httpServer;
}