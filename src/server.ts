import { createApp } from "./app"
import { loadConfig, type AppConfig } from "./config"

export function startServer(config: AppConfig = loadConfig()) {
  const app = createApp(config)

  if (config.authDisabled) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "AUTH_DISABLED=true — API authentication is off. Do not use in production.",
      }),
    )
  }

  console.log(
    JSON.stringify({
      level: "info",
      msg: "Starting PDF Inspector Service",
      port: config.port,
      hostname: "0.0.0.0",
      authDisabled: config.authDisabled,
      maxUploadBytes: config.maxUploadBytes,
      maxPages: config.maxPages,
    }),
  )

  return Bun.serve({
    port: config.port,
    hostname: "0.0.0.0",
    fetch: app.fetch,
  })
}
