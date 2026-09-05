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
    console.error("[Vercel API] Failed to initialize", error);
    return res.status(500).json({ error: "API initialization failed", detail: error instanceof Error ? error.message : String(error) });
  }
}
