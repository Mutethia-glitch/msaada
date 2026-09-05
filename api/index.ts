import crypto from "node:crypto";
import express from "express";
import mysql from "mysql2/promise";
import { SignJWT, jwtVerify } from "jose";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const COOKIE = "app_session_id";
const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
let pool: mysql.Pool | null = null;
let schemaReady = false;

function getPool() {
  if (!pool && process.env.DATABASE_URL) pool = mysql.createPool(process.env.DATABASE_URL);
  return pool;
}
async function getDatabase() {
  const database = getPool();
  if (!database) throw new Error("DATABASE_URL is not configured");
  if (!schemaReady) {
    try { await database.query("ALTER TABLE users ADD COLUMN passwordHash varchar(200) NULL"); }
    catch (error) { if (!String(error).includes("Duplicate column") && !String(error).includes("1060")) throw error; }
    await database.query("UPDATE users SET role = 'admin' WHERE LOWER(email) = ?", [ADMIN_EMAIL]);
    // Cleanup remains disabled until the provider-specific constraint error is inspected directly.
    schemaReady = true;
  }
  return database;
}
function passwordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}
function passwordMatches(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}
function emailOf(value: unknown) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
const ADMIN_EMAIL = "promisemutethia@gmail.com";
async function sessionToken(openId: string, name: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
  return new SignJWT({ openId, appId: process.env.VITE_APP_ID || "local", name }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime("1y").sign(secret);
}
function setSession(res: express.Response, token: string) { res.cookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: ONE_YEAR }); }
function cookieValue(req: express.Request) { return req.headers.cookie?.match(/(?:^|; )app_session_id=([^;]+)/)?.[1]; }
async function currentUser(req: express.Request) {
  const token = cookieValue(req); if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || ""));
    const database = await getDatabase();
    const [rows] = await database.query("SELECT id, openId, name, email, loginMethod, role, bio, createdAt, updatedAt, lastSignedIn FROM users WHERE openId = ? LIMIT 1", [payload.openId]);
    const user = (rows as any[])[0] || null;
    if (user && emailOf(user.email) === ADMIN_EMAIL && user.role !== "admin") { await database.query("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]); user.role = "admin"; }
    return user;
  } catch { return null; }
}
function addAuthPath(method: "post" | "get", path: string, handler: express.RequestHandler) { app[method](path, handler); app[method](path.replace(/^\/api/, ""), handler); }

addAuthPath("post", "/api/auth/register", async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = emailOf(req.body?.email); const password = req.body?.password;
    if (name.length < 2) return res.status(400).json({ error: "Please enter your name." });
    if (!email.includes("@")) return res.status(400).json({ error: "Please enter a valid email address." });
    if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const database = await getDatabase();
    const [existing] = await database.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if ((existing as any[]).length) return res.status(409).json({ error: "An account with this email already exists." });
    const openId = `local_${crypto.randomUUID()}`;
    await database.query("INSERT INTO users (openId, name, email, passwordHash, loginMethod) VALUES (?, ?, ?, ?, 'email')", [openId, name, email, passwordHash(password)]);
    setSession(res, await sessionToken(openId, name)); return res.status(201).json({ success: true });
  } catch (error) {
    console.error("[Auth] Registration failed", error);
    const message = String(error);
    if (message.includes("DATABASE_URL is not configured")) return res.status(503).json({ error: "The account database is not connected yet. Please configure DATABASE_URL in Vercel." });
    return res.status(500).json({ error: "Unable to create your account right now." });
  }
});
addAuthPath("post", "/api/auth/login", async (req, res) => {
  try {
    const email = emailOf(req.body?.email); const password = req.body?.password;
    const database = await getDatabase(); const [rows] = await database.query("SELECT openId, name, passwordHash FROM users WHERE email = ? LIMIT 1", [email]);
    const user = (rows as any[])[0];
    if (!user?.passwordHash || typeof password !== "string" || !passwordMatches(password, user.passwordHash)) return res.status(401).json({ error: "Email or password is incorrect." });
    if (email === ADMIN_EMAIL) await database.query("UPDATE users SET role = 'admin' WHERE openId = ?", [user.openId]);
    await database.query("UPDATE users SET lastSignedIn = CURRENT_TIMESTAMP WHERE openId = ?", [user.openId]);
    setSession(res, await sessionToken(user.openId, user.name || "Msaada member")); return res.json({ success: true });
  } catch (error) {
    console.error("[Auth] Login failed", error);
    const message = String(error);
    if (message.includes("DATABASE_URL is not configured")) return res.status(503).json({ error: "The account database is not connected yet. Please configure DATABASE_URL in Vercel." });
    return res.status(500).json({ error: "Unable to sign you in right now." });
  }
});
addAuthPath("get", "/api/auth/me", async (req, res) => res.json(await currentUser(req)));
addAuthPath("post", "/api/auth/logout", async (_req, res) => { res.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: "none", path: "/" }); res.json({ success: true }); });

function addCategoryPath(method: "get" | "post", path: string, handler: express.RequestHandler) { app[method](path, handler); app[method](path.replace(/^\/api/, ""), handler); }
addCategoryPath("get", "/api/categories", async (_req, res) => {
  try {
    const database = await getDatabase();
    const [rows] = await database.query("SELECT id, name, description, createdAt FROM need_categories ORDER BY name ASC");
    return res.json(rows);
  } catch (error) { console.error("[Categories] List failed", error); return res.status(500).json({ error: "Unable to load categories." }); }
});
addCategoryPath("post", "/api/categories", async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: "Category name must be between 2 and 80 characters." });
    const database = await getDatabase();
    const [existing] = await database.query("SELECT id, name, description, createdAt FROM need_categories WHERE LOWER(name) = LOWER(?) LIMIT 1", [name]);
    if ((existing as any[])[0]) return res.json((existing as any[])[0]);
    await database.query("INSERT INTO need_categories (name, description) VALUES (?, ?)", [name, typeof req.body?.description === "string" ? req.body.description.trim() || null : null]);
    const [created] = await database.query("SELECT id, name, description, createdAt FROM need_categories WHERE LOWER(name) = LOWER(?) LIMIT 1", [name]);
    return res.status(201).json((created as any[])[0]);
  } catch (error) { console.error("[Categories] Create failed", error); return res.status(500).json({ error: "Unable to add this category." }); }
});

function addNeedPath(path: string, handler: express.RequestHandler) { app.post(path, handler); app.post(path.replace(/^\/api/, ""), handler); }
addNeedPath("/api/needs/draft", async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in before posting a need." });
    const { title, story, publicSummary, location, urgency, beneficiaryCount, quantityLabel, goalAmount, categoryId, submitForReview } = req.body ?? {};
    if (typeof title !== "string" || title.trim().length < 3) return res.status(400).json({ error: "Add a need title of at least 3 characters." });
    if (typeof story !== "string" || story.trim().length < 20) return res.status(400).json({ error: "Write at least 20 characters describing the need." });
    if (typeof location !== "string" || location.trim().length < 2) return res.status(400).json({ error: "Add a location." });
    if (!Number.isInteger(categoryId) || categoryId < 1) return res.status(400).json({ error: "Choose a category." });
    const database = await getDatabase();
    const [categoryRows] = await database.query("SELECT id FROM need_categories WHERE id = ? LIMIT 1", [categoryId]);
    if (!(categoryRows as any[]).length) return res.status(400).json({ error: "Choose a valid category." });
    const lifecycle = submitForReview ? "pending_review" : "draft";
    const [result] = await database.query("INSERT INTO needs (creatorId, categoryId, title, story, publicSummary, location, urgency, lifecycle, verification, beneficiaryCount, quantityLabel, goalAmount, aiAssisted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, 0)", [user.id, categoryId, title.trim(), story.trim(), typeof publicSummary === "string" ? publicSummary.trim() : story.trim().slice(0, 3000), location.trim(), ["low", "medium", "high"].includes(urgency) ? urgency : "medium", lifecycle, Number.isInteger(beneficiaryCount) ? beneficiaryCount : 0, typeof quantityLabel === "string" ? quantityLabel.trim() || null : null, Number.isInteger(goalAmount) ? goalAmount : 0]);
    return res.status(201).json({ success: true, needId: (result as any).insertId, lifecycle });
  } catch (error) { console.error("[Needs] Draft creation failed", error); return res.status(500).json({ error: "Unable to save this need right now." }); }
});

function trpcJson(res: express.Response, data: unknown, status = 200) { return res.status(status).json([{ result: { data: { json: data } } }]); }
app.use((req, res, next) => {
  const requestPath = (req.originalUrl || req.url || "").split("?")[0];
  if (!requestPath.startsWith("/api/trpc/") && !requestPath.startsWith("/trpc/")) return next();
  const procedure = requestPath.replace(/^\/api\/trpc\//, "").replace(/^\/trpc\//, "");
  void (async () => {
    try {
      const rawInput = typeof req.query.input === "string" ? req.query.input : undefined;
      let input: any = req.body?.["0"]?.json ?? req.body?.json ?? req.body ?? {};
      if (rawInput) { try { const parsed = JSON.parse(rawInput); input = parsed?.json ?? parsed?.[0]?.json ?? parsed?.[0] ?? parsed; } catch {} }
      if (procedure === "auth.me") return trpcJson(res, await currentUser(req));
      if (procedure === "auth.logout") { res.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: "none", path: "/" }); return trpcJson(res, { success: true }); }
      const database = await getDatabase(); const user = await currentUser(req);
      if (["needs.mine", "needs.createDraft", "needs.approve", "contributions.mine", "contributions.pledge", "reports.create"].includes(procedure) && !user) return trpcJson(res, { message: "Please sign in" }, 401);
      if (procedure === "categories.list") { const [rows] = await database.query("SELECT id, name, description, createdAt FROM need_categories ORDER BY name ASC"); return trpcJson(res, rows); }
      if (procedure === "needs.list" || procedure === "needs.mine" || procedure === "needs.pending") {
        const condition = procedure === "needs.mine" ? "WHERE n.creatorId = ?" : procedure === "needs.pending" ? "WHERE n.lifecycle = 'pending_review'" : "WHERE n.lifecycle = 'active'";
        const params = procedure === "needs.mine" ? [user!.id] : [];
        const [rows] = await database.query(`SELECT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, c.createdAt categoryCreatedAt FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id ${condition} ORDER BY n.updatedAt DESC`, params);
        return trpcJson(res, (rows as any[]).map((row) => { const { categoryId, categoryName, categoryDescription, categoryCreatedAt, ...needRow } = row; return { need: needRow, category: categoryId ? { id: categoryId, name: categoryName, description: categoryDescription, createdAt: categoryCreatedAt } : null }; }));
      }
      if (procedure === "contributions.mine") { const [rows] = await database.query("SELECT co.*, n.id needId, n.title needTitle FROM contributions co LEFT JOIN needs n ON co.needId = n.id WHERE co.contributorId = ? ORDER BY co.updatedAt DESC", [user!.id]); return trpcJson(res, (rows as any[]).map((row) => ({ contribution: { id: row.id, needId: row.needId, contributorId: row.contributorId, type: row.type, description: row.description, amount: row.amount, quantityLabel: row.quantityLabel, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }, need: row.needId ? { id: row.needId, title: row.needTitle } : null })));
      }
      if (procedure === "needs.createDraft") { const [result] = await database.query("INSERT INTO needs (creatorId, categoryId, title, story, publicSummary, location, urgency, lifecycle, verification, beneficiaryCount, quantityLabel, goalAmount, aiAssisted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, 0)", [user!.id, input.categoryId, input.title, input.story, input.publicSummary || input.story?.slice(0, 3000), input.location, input.urgency || "medium", input.submitForReview ? "pending_review" : "draft", input.beneficiaryCount || 0, input.quantityLabel || null, input.goalAmount || 0]); return trpcJson(res, { needId: (result as any).insertId }); }
      if (procedure === "needs.approve") { await database.query("UPDATE needs SET lifecycle = 'active', verification = 'verified' WHERE id = ?", [input.needId]); await database.query("INSERT INTO verification_records (needId, reviewerId, decision, notes) VALUES (?, ?, 'approved', ?)", [input.needId, user!.id, input.notes || null]); return trpcJson(res, { success: true }); }
      if (procedure === "contributions.pledge") { const [result] = await database.query("INSERT INTO contributions (needId, contributorId, type, description, amount, quantityLabel, status) VALUES (?, ?, ?, ?, ?, ?, 'pledged')", [input.needId, user!.id, input.type, input.description, input.amount || null, input.quantityLabel || null]); return trpcJson(res, { id: (result as any).insertId, ...input, contributorId: user!.id, status: "pledged" }); }
      if (procedure === "reports.create") { const [result] = await database.query("INSERT INTO reports (needId, reporterId, category, details, status) VALUES (?, ?, ?, ?, 'open')", [input.needId, user!.id, input.category, input.details || null]); return trpcJson(res, { id: (result as any).insertId, ...input, reporterId: user!.id, status: "open" }); }
      if (procedure === "reports.list") { const [rows] = await database.query("SELECT * FROM reports ORDER BY createdAt DESC"); return trpcJson(res, rows); }
      return trpcJson(res, { message: `Unknown procedure: ${procedure}` }, 404);
    } catch (error) { console.error(`[tRPC] ${procedure} failed`, error); return trpcJson(res, { message: "Internal server error" }, 500); }
  })();
});

export default function api(req: express.Request, res: express.Response) { return app(req, res); }
