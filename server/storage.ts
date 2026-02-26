import { db } from "./db";
import {
  services, documents, otpSecrets,
  type Service, type InsertService,
  type Document, type InsertDocument,
  type OtpSecret, type InsertOtpSecret,
  type UpdateServiceRequest, type UpdateDocumentRequest, type UpdateOtpSecretRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Services
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, updates: UpdateServiceRequest): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: UpdateDocumentRequest): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // OTP Secrets
  getOtpSecrets(): Promise<OtpSecret[]>;
  getOtpSecret(id: number): Promise<OtpSecret | undefined>;
  createOtpSecret(secret: InsertOtpSecret): Promise<OtpSecret>;
  updateOtpSecret(id: number, updates: UpdateOtpSecretRequest): Promise<OtpSecret | undefined>;
  deleteOtpSecret(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Services
  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }
  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }
  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }
  async updateService(id: number, updates: UpdateServiceRequest): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(updates).where(eq(services.id, id)).returning();
    return updated;
  }
  async deleteService(id: number): Promise<boolean> {
    const [deleted] = await db.delete(services).where(eq(services.id, id)).returning();
    return !!deleted;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }
  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }
  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }
  async updateDocument(id: number, updates: UpdateDocumentRequest): Promise<Document | undefined> {
    const [updated] = await db.update(documents).set({...updates, updatedAt: new Date()}).where(eq(documents.id, id)).returning();
    return updated;
  }
  async deleteDocument(id: number): Promise<boolean> {
    const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning();
    return !!deleted;
  }

  // OTP Secrets
  async getOtpSecrets(): Promise<OtpSecret[]> {
    return await db.select().from(otpSecrets);
  }
  async getOtpSecret(id: number): Promise<OtpSecret | undefined> {
    const [secret] = await db.select().from(otpSecrets).where(eq(otpSecrets.id, id));
    return secret;
  }
  async createOtpSecret(secret: InsertOtpSecret): Promise<OtpSecret> {
    const [created] = await db.insert(otpSecrets).values(secret).returning();
    return created;
  }
  async updateOtpSecret(id: number, updates: UpdateOtpSecretRequest): Promise<OtpSecret | undefined> {
    const [updated] = await db.update(otpSecrets).set(updates).where(eq(otpSecrets.id, id)).returning();
    return updated;
  }
  async deleteOtpSecret(id: number): Promise<boolean> {
    const [deleted] = await db.delete(otpSecrets).where(eq(otpSecrets.id, id)).returning();
    return !!deleted;
  }
}

export const storage = new DatabaseStorage();