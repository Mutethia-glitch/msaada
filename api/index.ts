import type { Request, Response } from "express";
import { createApp } from "../server/app";

const app = createApp();

export default function api(req: Request, res: Response) {
  return app(req, res);
}
