import crypto from "node:crypto";
import express from "express";
import mysql from "mysql2/promise";
import { SignJWT, jwtVerify } from "jose";
import { get, put } from "@vercel/blob";

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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
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
async function createNotification(userId: number, title: string, body: string) {
  const database = await getDatabase();
  await database.query("INSERT INTO notifications (userId, title, body) VALUES (?, ?, ?)", [userId, title.slice(0, 180), body]);
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
app.get("/api/notifications", async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "Please sign in." });
  try { const database = await getDatabase(); const [rows] = await database.query("SELECT id, title, body, readAt, createdAt FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50", [user.id]); return res.json({ notifications: rows }); }
  catch (error) { console.error("[Notifications] Load failed", error); return res.status(500).json({ error: "Unable to load notifications." }); }
});
app.post("/api/notifications/read", async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "Please sign in." });
  try { const database = await getDatabase(); if (req.body?.all) await database.query("UPDATE notifications SET readAt = CURRENT_TIMESTAMP WHERE userId = ? AND readAt IS NULL", [user.id]); else { const id = Number(req.body?.id); if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "A valid notification is required." }); await database.query("UPDATE notifications SET readAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?", [id, user.id]); } return res.json({ success: true }); }
  catch (error) { console.error("[Notifications] Mark read failed", error); return res.status(500).json({ error: "Unable to update notifications." }); }
});
app.get("/api/dashboard", async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "Please sign in." });
  try { const database = await getDatabase(); const [needRows] = await database.query("SELECT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, c.createdAt categoryCreatedAt, (SELECT id FROM need_files WHERE needId = n.id AND mimeType LIKE 'image/%' ORDER BY createdAt DESC LIMIT 1) fileId FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id WHERE n.creatorId = ? ORDER BY n.updatedAt DESC", [user.id]); const [needTotals] = await database.query("SELECT needId, COALESCE(SUM(CASE WHEN type = 'money' AND status <> 'cancelled' THEN COALESCE(amount, 0) ELSE 0 END), 0) pledgedAmount FROM contributions WHERE needId IN (SELECT id FROM needs WHERE creatorId = ?) GROUP BY needId", [user.id]); const totals = new Map((needTotals as any[]).map((row) => [Number(row.needId), Number(row.pledgedAmount || 0)])); const [contributionRows] = await database.query("SELECT co.*, n.id needId, n.title needTitle FROM contributions co LEFT JOIN needs n ON co.needId = n.id WHERE co.contributorId = ? ORDER BY co.updatedAt DESC", [user.id]); const [supportedRows] = await database.query("SELECT DISTINCT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, (SELECT COALESCE(SUM(CASE WHEN type = 'money' AND status <> 'cancelled' THEN COALESCE(amount, 0) ELSE 0 END), 0) FROM contributions WHERE needId = n.id) pledgedAmount FROM needs n INNER JOIN contributions mine ON mine.needId = n.id LEFT JOIN need_categories c ON n.categoryId = c.id WHERE mine.contributorId = ? ORDER BY n.updatedAt DESC", [user.id]); const supportedNeeds = (supportedRows as any[]).map((row) => { const { categoryId, categoryName, categoryDescription, pledgedAmount, ...need } = row; const pledged = Number(pledgedAmount || 0); return { need: { ...need, pledgedAmount: pledged, fulfillmentPercent: Number(need.goalAmount) > 0 ? Math.min(100, Math.round((pledged / Number(need.goalAmount)) * 100)) : 0 }, category: categoryId ? { id: categoryId, name: categoryName, description: categoryDescription } : null }; }); return res.json({ needs: (needRows as any[]).map((row) => { const { categoryId, categoryName, categoryDescription, categoryCreatedAt, fileId, ...need } = row; const pledgedAmount = totals.get(Number(need.id)) || 0; const fulfillmentPercent = Number(need.goalAmount) > 0 ? Math.min(100, Math.round((pledgedAmount / Number(need.goalAmount)) * 100)) : 0; return { need: { ...need, pledgedAmount, fulfillmentPercent }, category: categoryId ? { id: categoryId, name: categoryName, description: categoryDescription, createdAt: categoryCreatedAt } : null, imageUrl: fileId ? `/api/dashboard/needs/${need.id}/preview` : null }; }), supportedNeeds, contributions: (contributionRows as any[]).map((row) => ({ contribution: { id: row.id, needId: row.needId, contributorId: row.contributorId, type: row.type, description: row.description, amount: row.amount, quantityLabel: row.quantityLabel, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }, need: row.needId ? { id: row.needId, title: row.needTitle } : null })) }); } catch (error) { console.error("[Dashboard] Load failed", error); return res.status(500).json({ error: "Unable to load dashboard activity." }); }
});
app.get("/api/dashboard/needs/:needId/preview", async (req, res) => { const user = await currentUser(req); if (!user) return res.status(401).send("Please sign in."); try { const database = await getDatabase(); const [files] = await database.query("SELECT f.fileKey, f.mimeType FROM need_files f INNER JOIN needs n ON n.id = f.needId WHERE f.needId = ? AND n.creatorId = ? AND f.mimeType LIKE 'image/%' ORDER BY f.createdAt DESC LIMIT 1", [Number(req.params.needId), user.id]); const file = (files as any[])[0]; if (!file) return res.status(404).send("Image not found."); const blob = await get(file.fileKey, { access: "private" }); if (blob.statusCode !== 200) return res.status(404).send("Image not found."); res.setHeader("Content-Type", file.mimeType); res.setHeader("Cache-Control", "private, max-age=300"); return res.send(Buffer.from(await new Response(blob.stream).arrayBuffer())); } catch (error) { console.error("[Dashboard] Image preview failed", error); return res.status(502).send("Unable to load image."); } });

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
app.put("/api/admin/categories/:categoryId", async (req, res) => {
  const user = await currentUser(req);
  if (user?.role !== "admin") return res.status(user ? 403 : 401).json({ error: "Admin access required." });
  const categoryId = Number(req.params.categoryId); const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""; const description = typeof req.body?.description === "string" ? req.body.description.trim() || null : null;
  if (!Number.isInteger(categoryId) || categoryId < 1 || name.length < 2 || name.length > 80) return res.status(400).json({ error: "Category name must be between 2 and 80 characters." });
  try { const database = await getDatabase(); const [duplicate] = await database.query("SELECT id FROM need_categories WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1", [name, categoryId]); if ((duplicate as any[]).length) return res.status(409).json({ error: "That category name already exists." }); const [result] = await database.query("UPDATE need_categories SET name = ?, description = ? WHERE id = ?", [name, description, categoryId]); if (!(result as any).affectedRows) return res.status(404).json({ error: "Category not found." }); const [updated] = await database.query("SELECT id, name, description, createdAt FROM need_categories WHERE id = ?", [categoryId]); return res.json((updated as any[])[0]); } catch (error) { console.error("[Categories] Update failed", error); return res.status(500).json({ error: "Unable to update this category." }); }
});
app.delete("/api/admin/categories/:categoryId", async (req, res) => {
  const user = await currentUser(req);
  if (user?.role !== "admin") return res.status(user ? 403 : 401).json({ error: "Admin access required." });
  const categoryId = Number(req.params.categoryId);
  if (!Number.isInteger(categoryId) || categoryId < 1) return res.status(400).json({ error: "A valid category is required." });
  try { const database = await getDatabase(); const [usage] = await database.query("SELECT COUNT(*) count FROM needs WHERE categoryId = ?", [categoryId]); if (Number((usage as any[])[0]?.count || 0) > 0) return res.status(409).json({ error: "This category is used by existing needs. Reassign those needs before deleting it." }); const [result] = await database.query("DELETE FROM need_categories WHERE id = ?", [categoryId]); if (!(result as any).affectedRows) return res.status(404).json({ error: "Category not found." }); return res.json({ success: true, categoryId }); } catch (error) { console.error("[Categories] Delete failed", error); return res.status(500).json({ error: "Unable to delete this category." }); }
});

function addNeedPath(path: string, handler: express.RequestHandler) { app.post(path, handler); app.post(path.replace(/^\/api/, ""), handler); }
app.get("/api/public/needs", async (_req, res) => {
  try {
    const database = await getDatabase();
    const [rows] = await database.query("SELECT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, c.createdAt categoryCreatedAt, f.id fileId, (SELECT COALESCE(SUM(CASE WHEN type = 'money' AND status <> 'cancelled' THEN COALESCE(amount, 0) ELSE 0 END), 0) FROM contributions WHERE needId = n.id) pledgedAmount FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id LEFT JOIN need_files f ON f.needId = n.id AND f.mimeType LIKE 'image/%' WHERE n.lifecycle = 'active' ORDER BY n.updatedAt DESC");
    const seen = new Set<number>();
    return res.json((rows as any[]).flatMap((row) => { if (seen.has(row.id)) return []; seen.add(row.id); const { categoryId, categoryName, categoryDescription, categoryCreatedAt, fileId, pledgedAmount, ...need } = row; const pledged = Number(pledgedAmount || 0); const fulfillmentPercent = Number(need.goalAmount) > 0 ? Math.min(100, Math.round((pledged / Number(need.goalAmount)) * 100)) : 0; return [{ need: { ...need, pledgedAmount: pledged, fulfillmentPercent }, category: categoryId ? { id: categoryId, name: categoryName, description: categoryDescription, createdAt: categoryCreatedAt } : null, imageUrl: fileId ? `/api/public/needs/${row.id}/preview` : null }]; }));
  } catch (error) { console.error("[Needs] Public list failed", error); return res.status(500).json({ error: "Unable to load needs." }); }
});
app.get("/api/public/needs/:needId/preview", async (req, res) => {
  try { const database = await getDatabase(); const [files] = await database.query("SELECT fileKey, mimeType FROM need_files f INNER JOIN needs n ON n.id = f.needId WHERE f.needId = ? AND f.mimeType LIKE 'image/%' AND n.lifecycle = 'active' ORDER BY f.createdAt DESC LIMIT 1", [Number(req.params.needId)]); const file = (files as any[])[0]; if (!file) return res.status(404).send("Image not found."); const blob = await get(file.fileKey, { access: "private" }); if (blob.statusCode !== 200) return res.status(404).send("Image not found."); res.setHeader("Content-Type", file.mimeType); res.setHeader("Cache-Control", "private, max-age=300"); return res.send(Buffer.from(await new Response(blob.stream).arrayBuffer())); } catch (error) { console.error("[Needs] Public image preview failed", error); return res.status(502).send("Unable to load image."); }
});
app.get("/api/admin/needs", async (req, res) => {
  const user = await currentUser(req);
  if (user?.role !== "admin") return res.status(user ? 403 : 401).json({ error: "Admin access required." });
  try {
    const database = await getDatabase();
    const [rows] = await database.query("SELECT n.*, c.name categoryName, f.id fileId, f.mimeType fileMimeType FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id LEFT JOIN need_files f ON f.needId = n.id AND f.mimeType LIKE 'image/%' ORDER BY n.updatedAt DESC");
    const grouped = new Map<number, any>();
    for (const row of rows as any[]) { const existing = grouped.get(row.id); if (existing) continue; const { categoryName, fileId, fileMimeType, ...need } = row; grouped.set(row.id, { need, category: categoryName ? { name: categoryName } : null, imageUrl: fileId ? `/api/admin/needs/${row.id}/preview` : null, imageMimeType: fileMimeType || null }); }
    return res.json([...grouped.values()]);
  } catch (error) { console.error("[Admin] Needs list failed", error); return res.status(500).json({ error: "Unable to load admin needs." }); }
});
app.get("/api/admin/needs/:needId/preview", async (req, res) => {
  const user = await currentUser(req);
  if (user?.role !== "admin") return res.status(user ? 403 : 401).send("Admin access required.");
  try { const database = await getDatabase(); const [files] = await database.query("SELECT fileKey, mimeType FROM need_files WHERE needId = ? AND mimeType LIKE 'image/%' ORDER BY createdAt DESC LIMIT 1", [Number(req.params.needId)]); const file = (files as any[])[0]; if (!file) return res.status(404).send("Image not found."); const blob = await get(file.fileKey, { access: "private" }); if (blob.statusCode !== 200) return res.status(404).send("Image not found."); res.setHeader("Content-Type", file.mimeType); res.setHeader("Cache-Control", "private, max-age=300"); return res.send(Buffer.from(await new Response(blob.stream).arrayBuffer())); } catch (error) { console.error("[Admin] Image preview failed", error); return res.status(502).send("Unable to load image."); }
});
app.post("/api/admin/needs/delete", async (req, res) => {
  const user = await currentUser(req);
  if (user?.role !== "admin") return res.status(user ? 403 : 401).json({ error: "Admin access required." });
  const needId = Number(req.body?.needId);
  if (!Number.isInteger(needId) || needId < 1) return res.status(400).json({ error: "A valid need is required." });
  try {
    const database = await getDatabase();
    const connection = await database.getConnection();
    await connection.beginTransaction();
    try {
      for (const table of ["reports", "contributions", "need_updates", "verification_records", "impact_records", "need_files"]) await connection.query(`DELETE FROM ${table} WHERE needId = ?`, [needId]);
      const [result] = await connection.query("DELETE FROM needs WHERE id = ?", [needId]);
      await connection.commit();
      connection.release();
      if (!(result as any).affectedRows) return res.status(404).json({ error: "Need not found." });
      return res.json({ success: true, needId });
    } catch (error) { await connection.rollback(); connection.release(); throw error; }
  } catch (error) { console.error("[Admin] Need deletion failed", error); return res.status(500).json({ error: "Unable to remove this need." }); }
});
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
    const needId = (result as any).insertId;
    const [admins] = await database.query("SELECT id FROM users WHERE role IN ('admin', 'moderator')");
    for (const admin of admins as any[]) await createNotification(Number(admin.id), "New need submitted", `${user.name || user.email || "A member"} submitted a need for review.`);
    return res.status(201).json({ success: true, needId, lifecycle });
  } catch (error) { console.error("[Needs] Draft creation failed", error); return res.status(500).json({ error: "Unable to save this need right now." }); }
});
addNeedPath("/api/needs/file", async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in before uploading a file." });
    const { needId, fileName, mimeType, data } = req.body ?? {};
    if (!Number.isInteger(needId) || needId < 1 || typeof fileName !== "string" || typeof mimeType !== "string" || typeof data !== "string") {
      return res.status(400).json({ error: "A valid need, file name, type, and file are required." });
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(mimeType)) return res.status(400).json({ error: "Upload a JPG, PNG, WEBP, or PDF file." });
    const encoded = data.replace(/^data:[^;]+;base64,/, "");
    const bytes = Buffer.from(encoded, "base64");
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) return res.status(400).json({ error: "Files must be smaller than 10 MB." });
    const database = await getDatabase();
    const [owned] = await database.query("SELECT id FROM needs WHERE id = ? AND creatorId = ? LIMIT 1", [needId, user.id]);
    if (!(owned as any[]).length) return res.status(404).json({ error: "Need not found." });
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-180) || "attachment";
    const uploaded = await put(`needs/${needId}/${safeName}`, bytes, { access: "private", contentType: mimeType, addRandomSuffix: true });
    await database.query("INSERT INTO need_files (needId, uploadedBy, fileKey, fileUrl, fileName, mimeType) VALUES (?, ?, ?, ?, ?, ?)", [needId, user.id, uploaded.pathname, uploaded.url, fileName.slice(0, 255), mimeType]);
    return res.status(201).json({ success: true, fileUrl: uploaded.url, fileName: fileName.slice(0, 255), mimeType });
  } catch (error) {
    const message = String(error);
    console.error("[Needs] File upload failed:", message);
    if (message.includes("BLOB_READ_WRITE_TOKEN") || message.includes("No token")) return res.status(503).json({ error: "Vercel Blob storage is not connected to this deployment." });
    return res.status(502).json({ error: "The attachment storage service rejected the upload.", detail: message.slice(0, 240) });
  }
});

function trpcJson(res: express.Response, data: unknown, status = 200) { return res.status(status).json([{ result: { data } }]); }
function trpcError(res: express.Response, message: string, code: string, status: number) { return res.status(status).json([{ error: { message, data: { code, httpStatus: status } } }]); }
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
      if (["needs.mine", "needs.createDraft", "needs.approve", "contributions.mine", "contributions.pledge", "reports.create", "needs.pending", "reports.list"].includes(procedure) && !user) return trpcError(res, "Please sign in", "UNAUTHORIZED", 401);
      if (["needs.pending", "needs.approve"].includes(procedure) && !["admin", "moderator"].includes(user?.role || "")) return trpcError(res, "Moderator access required", "FORBIDDEN", 403);
      if (procedure === "reports.list" && user?.role !== "admin") return trpcError(res, "Admin access required", "FORBIDDEN", 403);
      if (procedure === "categories.list") { const [rows] = await database.query("SELECT id, name, description, createdAt FROM need_categories ORDER BY name ASC"); return trpcJson(res, rows); }
      if (procedure === "needs.list" || procedure === "needs.mine" || procedure === "needs.pending") {
        const condition = procedure === "needs.mine" ? "WHERE n.creatorId = ?" : procedure === "needs.pending" ? "WHERE n.lifecycle = 'pending_review'" : "WHERE n.lifecycle = 'active'";
        const params = procedure === "needs.mine" ? [user!.id] : [];
        const [rows] = await database.query(`SELECT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, c.createdAt categoryCreatedAt FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id ${condition} ORDER BY n.updatedAt DESC`, params);
        return trpcJson(res, (rows as any[]).map((row) => { const { categoryId, categoryName, categoryDescription, categoryCreatedAt, ...needRow } = row; return { need: needRow, category: categoryId ? { id: categoryId, name: categoryName, description: categoryDescription, createdAt: categoryCreatedAt } : null }; }));
      }
      if (procedure === "contributions.mine") { const [rows] = await database.query("SELECT co.*, n.id needId, n.title needTitle FROM contributions co LEFT JOIN needs n ON co.needId = n.id WHERE co.contributorId = ? ORDER BY co.updatedAt DESC", [user!.id]); return trpcJson(res, (rows as any[]).map((row) => ({ contribution: { id: row.id, needId: row.needId, contributorId: row.contributorId, type: row.type, description: row.description, amount: row.amount, quantityLabel: row.quantityLabel, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }, need: row.needId ? { id: row.needId, title: row.needTitle } : null })));
      }
      if (procedure === "needs.createDraft") { const [result] = await database.query("INSERT INTO needs (creatorId, categoryId, title, story, publicSummary, location, urgency, lifecycle, verification, beneficiaryCount, quantityLabel, goalAmount, aiAssisted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, 0)", [user!.id, input.categoryId, input.title, input.story, input.publicSummary || input.story?.slice(0, 3000), input.location, input.urgency || "medium", input.submitForReview ? "pending_review" : "draft", input.beneficiaryCount || 0, input.quantityLabel || null, input.goalAmount || 0]); const [admins] = await database.query("SELECT id FROM users WHERE role IN ('admin', 'moderator')"); for (const admin of admins as any[]) await createNotification(Number(admin.id), "New need submitted", `${user!.name || user!.email || "A member"} submitted a need for review.`); return trpcJson(res, { needId: (result as any).insertId }); }
      if (procedure === "needs.approve") { await database.query("UPDATE needs SET lifecycle = 'active', verification = 'verified' WHERE id = ?", [input.needId]); await database.query("INSERT INTO verification_records (needId, reviewerId, decision, notes) VALUES (?, ?, 'approved', ?)", [input.needId, user!.id, input.notes || null]); const [owners] = await database.query("SELECT creatorId, title FROM needs WHERE id = ?", [input.needId]); const owner = (owners as any[])[0]; if (owner) await createNotification(Number(owner.creatorId), "Need approved", `Your need “${owner.title}” is now visible to the community.`); return trpcJson(res, { success: true }); }
      if (procedure === "contributions.pledge") { const amount = Number(input.amount); if (!Number.isFinite(amount) || amount <= 0) return trpcError(res, "Enter a positive money amount", "BAD_REQUEST", 400); const description = typeof input.description === "string" && input.description.trim() ? input.description.trim() : `Money pledge of KSh ${amount.toLocaleString("en-KE")}`; const [result] = await database.query("INSERT INTO contributions (needId, contributorId, type, description, amount, quantityLabel, status) VALUES (?, ?, ?, ?, ?, NULL, 'pledged')", [input.needId, user!.id, "money", description, amount]); const [owners] = await database.query("SELECT creatorId, title FROM needs WHERE id = ?", [input.needId]); const owner = (owners as any[])[0]; if (owner && Number(owner.creatorId) !== Number(user!.id)) await createNotification(Number(owner.creatorId), "New pledge received", `Someone pledged KSh ${amount.toLocaleString("en-KE")} to “${owner.title}”.`); return trpcJson(res, { id: (result as any).insertId, needId: input.needId, type: "money", description, amount, contributorId: user!.id, status: "pledged" }); }
      if (procedure === "reports.create") { const [result] = await database.query("INSERT INTO reports (needId, reporterId, category, details, status) VALUES (?, ?, ?, ?, 'open')", [input.needId, user!.id, input.category, input.details || null]); const [admins] = await database.query("SELECT id FROM users WHERE role = 'admin'"); for (const admin of admins as any[]) await createNotification(Number(admin.id), "New report received", "A community member submitted a report for moderator review."); return trpcJson(res, { id: (result as any).insertId, ...input, reporterId: user!.id, status: "open" }); }
      if (procedure === "reports.list") { const [rows] = await database.query("SELECT * FROM reports ORDER BY createdAt DESC"); return trpcJson(res, rows); }
      return trpcJson(res, { message: `Unknown procedure: ${procedure}` }, 404);
    } catch (error) { console.error(`[tRPC] ${procedure} failed`, error); return trpcJson(res, { message: "Internal server error" }, 500); }
  })();
});

export default function api(req: express.Request, res: express.Response) { return app(req, res); }
