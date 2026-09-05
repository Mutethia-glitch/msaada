import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const credentialsSchema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(8).max(200) });
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(120) });

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

const normalizedEmail = (email: string) => email.trim().toLowerCase();

async function startSession(req: Request, res: Response, user: { openId: string; name: string }) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name, expiresInMs: ONE_YEAR_MS });
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
}

function invalidRequest(res: Response, error: unknown) {
  if (!(error instanceof z.ZodError)) return false;
  res.status(400).json({ error: error.issues[0]?.message ?? "Please check your details." });
  return true;
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);
      const email = normalizedEmail(input.email);
      if (await db.getUserByEmail(email)) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }
      const openId = `local_${crypto.randomUUID()}`;
      await db.createLocalUser({ openId, name: input.name, email, passwordHash: hashPassword(input.password) });
      await startSession(req, res, { openId, name: input.name });
      res.status(201).json({ success: true });
    } catch (error) {
      if (invalidRequest(res, error)) return;
      console.error("[Auth] Registration failed", error);
      res.status(500).json({ error: "Unable to create your account right now." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = credentialsSchema.parse(req.body);
      const user = await db.getUserByEmail(normalizedEmail(input.email));
      if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        res.status(401).json({ error: "Email or password is incorrect." });
        return;
      }
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      await startSession(req, res, { openId: user.openId, name: user.name || "Msaada member" });
      res.json({ success: true });
    } catch (error) {
      if (invalidRequest(res, error)) return;
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Unable to sign you in right now." });
    }
  });
}

