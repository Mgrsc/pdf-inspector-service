import { Hono } from "hono"
import { cors } from "hono/cors"
import { serveStatic } from "hono/bun"
import type { AppConfig } from "./config"
import { authMiddleware, type AuthVariables } from "./middleware/auth"
import { errorHandler } from "./middleware/error-handler"
import { requestIdMiddleware } from "./middleware/request-id"
import { healthRoutes } from "./routes/health"
import { v1Routes } from "./routes/v1"
import { openApiDocument } from "./openapi"

const WEB_INDEX = "./web/dist/index.html"

export function createApp(config: AppConfig) {
  const app = new Hono<{ Variables: AuthVariables }>()
  const openapi = openApiDocument(config.version)
  let cachedIndexHtml: string | null | undefined

  app.onError(errorHandler)
  app.use("*", requestIdMiddleware())

  app.use(
    "*",
    cors({
      origin: config.corsOrigin === "*" ? "*" : config.corsOrigin.split(",").map((s) => s.trim()),
      allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Request-Id"],
      exposeHeaders: ["X-Request-Id", "X-Pdf-Type", "X-Page-Count"],
    }),
  )

  app.route("/", healthRoutes(config))
  app.get("/openapi.json", (c) => c.json(openapi))

  app.use("/v1/*", authMiddleware(config))
  app.route("/v1", v1Routes(config))

  app.use(
    "/*",
    serveStatic({
      root: "./web/dist",
      rewriteRequestPath: (path) => (path === "/" ? "/index.html" : path),
    }),
  )

  app.get("*", async (c) => {
    if (cachedIndexHtml === undefined) {
      const file = Bun.file(WEB_INDEX)
      cachedIndexHtml = (await file.exists()) ? await file.text() : null
    }
    if (cachedIndexHtml) {
      return c.html(cachedIndexHtml)
    }
    return c.json(
      {
        error: {
          code: "not_found",
          message: "Not found. Build the web UI with `bun run build:web` or call /v1/* API routes.",
          requestId: c.get("requestId") ?? "unknown",
        },
      },
      404,
    )
  })

  return app
}

export type App = ReturnType<typeof createApp>
