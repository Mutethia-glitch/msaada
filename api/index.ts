import express from "express";
import * as db from "../server/db";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.post("/api/auth/register", (_req, res) => res.status(503).json({ error: "probe" }));
app.post("/auth/register", (_req, res) => res.status(503).json({ error: "probe" }));

export default function api(req: express.Request, res: express.Response) { return app(req, res); }
void db;
