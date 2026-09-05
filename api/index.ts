import express from "express";
import mysql from "mysql2/promise";
void mysql;
const app = express();
app.use(express.json());
app.post("/api/auth/register", (_req, res) => res.status(503).json({ error: "probe" }));
app.post("/auth/register", (_req, res) => res.status(503).json({ error: "probe" }));
export default function api(req: express.Request, res: express.Response) { return app(req, res); }
