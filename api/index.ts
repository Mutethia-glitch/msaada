import express from "express";
import { createApp } from "../server/app";

const app = createApp();

export default function api(req: express.Request, res: express.Response) {
  return app(req, res);
}
