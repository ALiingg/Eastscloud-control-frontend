import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PgStore = connectPgSimple(session);

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set for secure session management");
  }

  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PgStore({
        pool: pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: "pmcenter.sid",
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    const userId = req.session.userId;
    const username = req.session.username;
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.username = username;
      resolve();
    });
  });
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return { allowed: true };

  if (record.count >= MAX_ATTEMPTS) {
    const elapsed = now - record.lastAttempt;
    if (elapsed < LOCKOUT_DURATION) {
      return { allowed: false, retryAfter: Math.ceil((LOCKOUT_DURATION - elapsed) / 1000) };
    }
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record) {
    record.count++;
    record.lastAttempt = now;
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

export function clearFailedAttempts(ip: string) {
  loginAttempts.delete(ip);
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}