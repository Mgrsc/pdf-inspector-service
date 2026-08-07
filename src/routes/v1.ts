import { Hono } from "hono"
import type { AppConfig } from "../config"
import { runCpuBound } from "../lib/cpu"
import { parsePagesParam } from "../lib/pages"
import { readPdfBuffer } from "../lib/pdf-body"
import type { AuthVariables } from "../middleware/auth"
import * as pdf from "../services/pdf-inspector"

export function v1Routes(config: AppConfig) {
  const app = new Hono<{ Variables: AuthVariables }>()

  app.post("/classify", async (c) => {
    const buffer = await readPdfBuffer(c, config.maxUploadBytes)
    const result = await runCpuBound(() => pdf.classify(buffer, config.maxPages))
    return c.json({
      ...result,
      requestId: c.get("requestId"),
    })
  })

  app.post("/process", async (c) => {
    const buffer = await readPdfBuffer(c, config.maxUploadBytes)
    const pages = parsePagesParam(c.req.query("pages"))
    const result = await runCpuBound(() => pdf.process(buffer, config.maxPages, pages))

    const responseMode = c.req.query("response") ?? "json"
    if (responseMode === "markdown") {
      c.header("Content-Type", "text/markdown; charset=utf-8")
      c.header("X-Pdf-Type", result.pdfType)
      c.header("X-Page-Count", String(result.pageCount))
      return c.body(result.markdown ?? "")
    }

    return c.json({
      ...result,
      requestId: c.get("requestId"),
    })
  })

  app.post("/extract/text", async (c) => {
    const buffer = await readPdfBuffer(c, config.maxUploadBytes)
    const result = await runCpuBound(() => pdf.extractText(buffer, config.maxPages))
    return c.json({
      ...result,
      requestId: c.get("requestId"),
    })
  })

  app.post("/extract/pages", async (c) => {
    const buffer = await readPdfBuffer(c, config.maxUploadBytes)
    const pages = parsePagesParam(c.req.query("pages"))
    const result = await runCpuBound(() => pdf.extractPages(buffer, config.maxPages, pages))
    return c.json({
      ...result,
      requestId: c.get("requestId"),
    })
  })

  return app
}
