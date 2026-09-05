import { bigint, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "moderator", "admin"]).default("user").notNull(),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const needCategories = mysqlTable("need_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const needs = mysqlTable("needs", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull().references(() => users.id),
  categoryId: int("categoryId").notNull().references(() => needCategories.id),
  title: varchar("title", { length: 180 }).notNull(),
  story: text("story").notNull(),
  publicSummary: text("publicSummary"),
  location: varchar("location", { length: 120 }).notNull(),
  urgency: mysqlEnum("urgency", ["low", "medium", "high"]).default("medium").notNull(),
  lifecycle: mysqlEnum("lifecycle", ["draft", "pending_review", "active", "partially_fulfilled", "fulfilled", "closed"]).default("draft").notNull(),
  verification: mysqlEnum("verification", ["pending_review", "review_in_progress", "verified", "rejected"]).default("pending_review").notNull(),
  beneficiaryCount: int("beneficiaryCount").default(0).notNull(),
  quantityLabel: varchar("quantityLabel", { length: 180 }),
  goalAmount: int("goalAmount").default(0).notNull(),
  aiAssisted: int("aiAssisted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ creatorIdx: index("needs_creator_idx").on(table.creatorId), lifecycleIdx: index("needs_lifecycle_idx").on(table.lifecycle), locationIdx: index("needs_location_idx").on(table.location) }));

export const contributions = mysqlTable("contributions", {
  id: int("id").autoincrement().primaryKey(),
  needId: int("needId").notNull().references(() => needs.id),
  contributorId: int("contributorId").notNull().references(() => users.id),
  type: mysqlEnum("type", ["money", "items", "skills", "time", "logistics", "professional_services"]).notNull(),
  description: text("description").notNull(),
  amount: int("amount"),
  quantityLabel: varchar("quantityLabel", { length: 160 }),
  status: mysqlEnum("status", ["pledged", "confirmed", "completed", "cancelled"]).default("pledged").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ needIdx: index("contributions_need_idx").on(table.needId), contributorIdx: index("contributions_contributor_idx").on(table.contributorId) }));

export const needUpdates = mysqlTable("need_updates", {
  id: int("id").autoincrement().primaryKey(),
  needId: int("needId").notNull().references(() => needs.id),
  authorId: int("authorId").notNull().references(() => users.id),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const verificationRecords = mysqlTable("verification_records", {
  id: int("id").autoincrement().primaryKey(),
  needId: int("needId").notNull().references(() => needs.id),
  reviewerId: int("reviewerId").notNull().references(() => users.id),
  decision: mysqlEnum("decision", ["approved", "rejected", "changes_requested"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const impactRecords = mysqlTable("impact_records", {
  id: int("id").autoincrement().primaryKey(),
  needId: int("needId").notNull().references(() => needs.id),
  reportedBy: int("reportedBy").notNull().references(() => users.id),
  headline: varchar("headline", { length: 180 }).notNull(),
  detail: text("detail").notNull(),
  beneficiaryCount: int("beneficiaryCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  needId: int("needId").notNull().references(() => needs.id),
  reporterId: int("reporterId").notNull().references(() => users.id),
  category: mysqlEnum("category", ["suspicious_request", "misleading_information", "duplicate", "inappropriate_content", "other"]).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["open", "reviewing", "resolved", "dismissed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const needFiles = mysqlTable("need_files", {
  id: int("id").autoincrement().primaryKey(),
  needId: int("needId").notNull().references(() => needs.id),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
