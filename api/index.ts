import express from "express";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const registerHandler: express.RequestHandler = (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@")) return res.status(400).json({ error: "Please enter a valid email address." });
  if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (typeof name !== "string" || name.trim().length < 2) return res.status(400).json({ error: "Please enter your name." });
  return res.status(503).json({ error: "Account service is temporarily unavailable." });
};
app.post("/api/auth/register", registerHandler);
app.post("/auth/register", registerHandler);

const loginHandler: express.RequestHandler = (_req, res) => res.status(503).json({ error: "Account service is temporarily unavailable." });
app.post("/api/auth/login", loginHandler);
app.post("/auth/login", loginHandler);

export default function api(req: express.Request, res: express.Response) {
  return app(req, res);
}
