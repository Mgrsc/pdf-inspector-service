import { Hono } from "hono"
import type { AppConfig } from "../config"

export function healthRoutes(config: AppConfig) {
  const app = new Hono()

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      version: config.version,
    }),
  )

  app.get("/ready", (c) =>
    c.json({
      status: "ready",
      authDisabled: config.authDisabled,
    }),
  )

  return app
}
