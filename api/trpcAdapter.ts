import type { Express, Request, Response } from "express";
import { getDatabase, currentUserForApi } from "./trpcData";

function payload(data: unknown) { return [{ result: { data: { json: data } } }]; }
function inputOf(req: Request): any {
  const raw = typeof req.query.input === "string" ? req.query.input : undefined;
  if (raw) { try { const parsed = JSON.parse(raw); return parsed?.json ?? parsed?.[0]?.json ?? parsed?.[0] ?? parsed; } catch {} }
  const body = req.body?.["0"] ?? req.body;
  return body?.json ?? body?.input ?? body;
}
function send(res: Response, data: unknown, status = 200) { return res.status(status).json(payload(data)); }
function category(row: any) { return row.categoryId ? { id: row.categoryId, name: row.categoryName, description: row.categoryDescription, createdAt: row.categoryCreatedAt } : null; }
function need(row: any) { const { categoryId, categoryName, categoryDescription, categoryCreatedAt, ...rest } = row; return { need: rest, category: category(row) }; }

export function registerTrpcAdapter(app: Express) {
  const handler = async (req: Request, res: Response) => {
    let procedure = "unknown";
    try {
      procedure = (req.path || req.url || "").replace(/^\//, "").split("?")[0];
      if (procedure === "auth.me") return send(res, await currentUserForApi(req));
      if (procedure === "auth.logout") { res.clearCookie("app_session_id", { httpOnly: true, secure: true, sameSite: "none", path: "/" }); return send(res, { success: true }); }
      const db = await getDatabase();
      const user = await currentUserForApi(req);
      if (["needs.mine", "needs.createDraft", "contributions.mine", "contributions.pledge", "reports.create"].includes(procedure) && !user) return send(res, { message: "Please sign in" }, 401);
      if (procedure === "categories.list") { const [rows] = await db.query("SELECT id, name, description, createdAt FROM need_categories ORDER BY name ASC"); return send(res, rows); }
      if (procedure === "needs.list") { const [rows] = await db.query("SELECT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, c.createdAt categoryCreatedAt FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id WHERE n.lifecycle = 'active' ORDER BY n.createdAt DESC"); return send(res, (rows as any[]).map(need)); }
      if (procedure === "needs.mine") { const [rows] = await db.query("SELECT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, c.createdAt categoryCreatedAt FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id WHERE n.creatorId = ? ORDER BY n.updatedAt DESC", [user!.id]); return send(res, (rows as any[]).map(need)); }
      if (procedure === "needs.pending") { const [rows] = await db.query("SELECT n.*, c.id categoryId, c.name categoryName, c.description categoryDescription, c.createdAt categoryCreatedAt FROM needs n LEFT JOIN need_categories c ON n.categoryId = c.id WHERE n.lifecycle = 'pending_review' ORDER BY n.updatedAt DESC"); return send(res, (rows as any[]).map(need)); }
      if (procedure === "contributions.mine") { const [rows] = await db.query("SELECT co.*, n.id needId, n.title needTitle FROM contributions co LEFT JOIN needs n ON co.needId = n.id WHERE co.contributorId = ? ORDER BY co.updatedAt DESC", [user!.id]); return send(res, (rows as any[]).map((row) => ({ contribution: { id: row.id, needId: row.needId, contributorId: row.contributorId, type: row.type, description: row.description, amount: row.amount, quantityLabel: row.quantityLabel, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }, need: row.needId ? { id: row.needId, title: row.needTitle } : null }))); }
      if (procedure === "reports.list") { const [rows] = await db.query("SELECT * FROM reports ORDER BY createdAt DESC"); return send(res, rows); }
      return send(res, { message: `Unknown procedure: ${procedure}` }, 404);
    } catch (error) { console.error(`[tRPC adapter] ${procedure} failed`, error); return send(res, { message: "Internal server error" }, 500); }
  };
  const procedures = ["auth.me", "auth.logout", "categories.list", "needs.list", "needs.mine", "needs.pending", "needs.createDraft", "contributions.mine", "contributions.pledge", "reports.list", "reports.create"];
  for (const procedure of procedures) {
    app.get(`/api/trpc/${procedure}`, handler);
    app.post(`/api/trpc/${procedure}`, handler);
    app.get(`/trpc/${procedure}`, handler);
    app.post(`/trpc/${procedure}`, handler);
  }
}
