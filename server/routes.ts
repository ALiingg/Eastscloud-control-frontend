import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
  app.get(api.otpSecrets.list.path, async (req, res) => {
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