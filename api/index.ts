import express from "express";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

export default function api(req: express.Request, res: express.Response) {
  return app(req, res);
}
