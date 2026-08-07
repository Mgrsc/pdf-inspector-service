import { createMiddleware } from "hono/factory"
import type { AppConfig } from "../config"
import { extractApiKey, keyIdFor, keyMatches } from "../lib/auth"
import { unauthorized } from "../lib/errors"

export type AuthVariables = {
  keyId: string
  requestId: string
}

export function authMiddleware(config: AppConfig) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    if (config.authDisabled) {
      c.set("keyId", "auth-disabled")
      await next()
      return
    }

    const provided = extractApiKey(c.req.header("authorization"), c.req.header("x-api-key"))
    if (!provided || !keyMatches(provided, config.apiKeys)) {
      throw unauthorized()
    }

    c.set("keyId", keyIdFor(provided))
    await next()
  })
}
