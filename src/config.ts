export type AppConfig = {
  port: number
  apiKeys: string[]
  authDisabled: boolean
  maxUploadBytes: number
  maxPages: number
  corsOrigin: string
  logLevel: string
  version: string
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid positive integer: ${value}`)
  }
  return n
}

function parseApiKeys(raw: string | undefined): string[] {
  if (!raw || raw.trim() === "") return []
  return raw
    .split(",")
    .map((part) => {
      const trimmed = part.trim()
      if (!trimmed) return ""
      const colon = trimmed.indexOf(":")
      if (colon > 0) {
        return trimmed.slice(0, colon).trim()
      }
      return trimmed
    })
    .filter((key) => key.length > 0)
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const authDisabled = env.AUTH_DISABLED === "true" || env.AUTH_DISABLED === "1"
  const apiKeys = parseApiKeys(env.API_KEYS)

  if (!authDisabled && apiKeys.length === 0) {
    throw new Error(
      "API_KEYS is required when AUTH_DISABLED is not true. Set API_KEYS or AUTH_DISABLED=true for local dev.",
    )
  }

  return {
    port: parsePositiveInt(env.PORT, 3000),
    apiKeys,
    authDisabled,
    maxUploadBytes: parsePositiveInt(env.MAX_UPLOAD_BYTES, 32 * 1024 * 1024),
    maxPages: parsePositiveInt(env.MAX_PAGES, 500),
    corsOrigin: env.CORS_ORIGIN?.trim() || "*",
    logLevel: env.LOG_LEVEL?.trim() || "info",
    version: env.npm_package_version || "0.1.0",
  }
}
