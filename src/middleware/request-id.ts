import { createMiddleware } from "hono/factory"
import { randomUUID } from "node:crypto"
import type { AuthVariables } from "./auth"

export function requestIdMiddleware() {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const incoming = c.req.header("x-request-id")?.trim()
    const requestId = incoming && incoming.length > 0 ? incoming : randomUUID()
    c.set("requestId", requestId)
    c.header("X-Request-Id", requestId)
    await next()
  })
}
