import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createApp } from "../src/app"
import type { AppConfig } from "../src/config"

export const FIXTURES = join(import.meta.dir, "fixtures")

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    apiKeys: ["test-secret-key"],
    authDisabled: false,
    maxUploadBytes: 32 * 1024 * 1024,
    maxPages: 500,
    corsOrigin: "*",
    logLevel: "error",
    version: "0.1.0-test",
    ...overrides,
  }
}

export function testApp(overrides: Partial<AppConfig> = {}) {
  return createApp(testConfig(overrides))
}

export function fixture(name: string): Buffer {
  return readFileSync(join(FIXTURES, name))
}

export function authHeaders(key = "test-secret-key"): Record<string, string> {
  return { Authorization: `Bearer ${key}` }
}
