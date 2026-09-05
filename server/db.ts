import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { contributions, InsertUser, needCategories, needs, reports, users, verificationRecords } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "passwordHash", "loginMethod", "bio"] as const;
  textFields.forEach((field) => { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
export async function getUserByEmail(email: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.email, email)).limit(1); return result[0]; }
export async function createLocalUser(user: InsertUser) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(users).values({ ...user, loginMethod: "email" }); }
export async function listPublicNeeds() { const db = await getDb(); if (!db) return []; return db.select({ need: needs, category: needCategories }).from(needs).leftJoin(needCategories, eq(needs.categoryId, needCategories.id)).where(and(eq(needs.lifecycle, "active"))).orderBy(desc(needs.createdAt)); }
export async function createNeedDraft(input: typeof needs.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(needs).values(input); return result[0]; }
export async function createContribution(input: typeof contributions.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(contributions).values(input); return result[0]; }
export async function createReport(input: typeof reports.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(reports).values(input); return result[0]; }
export async function recordVerification(input: typeof verificationRecords.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(verificationRecords).values(input); return result[0]; }

export async function listNeedsForUser(userId: number) { const db = await getDb(); if (!db) return []; return db.select({ need: needs, category: needCategories }).from(needs).leftJoin(needCategories, eq(needs.categoryId, needCategories.id)).where(eq(needs.creatorId, userId)).orderBy(desc(needs.updatedAt)); }
export async function listContributionsForUser(userId: number) { const db = await getDb(); if (!db) return []; return db.select({ contribution: contributions, need: needs }).from(contributions).leftJoin(needs, eq(contributions.needId, needs.id)).where(eq(contributions.contributorId, userId)).orderBy(desc(contributions.updatedAt)); }
export async function listPendingNeeds() { const db = await getDb(); if (!db) return []; return db.select({ need: needs, category: needCategories }).from(needs).leftJoin(needCategories, eq(needs.categoryId, needCategories.id)).where(eq(needs.lifecycle, "pending_review")).orderBy(desc(needs.updatedAt)); }
