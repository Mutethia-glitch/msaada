import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { jwtVerify } from "jose";
import type { Request } from "express";

let pool: mysql.Pool | null = null;
let schemaReady = false;
export function getPool() { if (!pool && process.env.DATABASE_URL) pool = mysql.createPool(process.env.DATABASE_URL); return pool; }
export async function getDatabase() {
  const database = getPool(); if (!database) throw new Error("DATABASE_URL is not configured");
  if (!schemaReady) { try { await database.query("ALTER TABLE users ADD COLUMN passwordHash varchar(200) NULL"); } catch (error) { if (!String(error).includes("Duplicate column") && !String(error).includes("1060")) throw error; } schemaReady = true; }
  return database;
}
export async function currentUserForApi(req: Request) {
  const token = req.headers.cookie?.match(/(?:^|; )app_session_id=([^;]+)/)?.[1]; if (!token) return null;
  try { const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || "")); const database = await getDatabase(); const [rows] = await database.query("SELECT id, openId, name, email, loginMethod, role, bio, createdAt, updatedAt, lastSignedIn FROM users WHERE openId = ? LIMIT 1", [payload.openId]); return (rows as any[])[0] || null; } catch { return null; }
}
void crypto;
