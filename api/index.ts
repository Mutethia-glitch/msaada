import type { Request, Response } from "express";

let handler: ((req: Request, res: Response) => unknown) | null = null;

export default async function api(req: Request, res: Response) {
  try {
    if (!handler) {
      const { createApp } = await import("../server/app");
      handler = createApp();
    }
    return handler(req, res);
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    console.error("[Vercel API] Failed to initialize", detail);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "API initialization failed", detail }));
  }
}
