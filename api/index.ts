import type { Request, Response } from "express";

export default function api(_req: Request, res: Response) {
  return res.status(200).json({ ok: true, service: "msaada-api" });
}
