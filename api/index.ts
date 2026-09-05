import type { Request, Response } from "express";
import { createApp } from "../server/app";

let handler: ReturnType<typeof createApp> | null = null;

export default function api(req: Request, res: Response) {
  try {
    if (!handler) handler = createApp();
    return handler(req, res);
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    console.error("[Vercel API] Failed to initialize", detail);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "API initialization failed", detail }));
  }
}
