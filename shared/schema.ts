import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  icon: text("icon"), 
  category: text("category").notNull(), 
  description: text("description"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otpSecrets = pgTable("otp_secrets", {
  id: serial("id").primaryKey(),
  issuer: text("issuer").notNull(),
  account: text("account").notNull(),
  secret: text("secret").notNull(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOtpSecretSchema = createInsertSchema(otpSecrets).omit({ id: true });

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type OtpSecret = typeof otpSecrets.$inferSelect;
export type InsertOtpSecret = z.infer<typeof insertOtpSecretSchema>;

export type CreateServiceRequest = InsertService;
export type UpdateServiceRequest = Partial<InsertService>;

export type CreateDocumentRequest = InsertDocument;
export type UpdateDocumentRequest = Partial<InsertDocument>;

export type CreateOtpSecretRequest = InsertOtpSecret;
export type UpdateOtpSecretRequest = Partial<InsertOtpSecret>;