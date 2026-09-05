import express from "express";
import { registerLocalAuthRoutes } from "./_core/localAuth";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerLocalAuthRoutes(app);
  return app;
}
