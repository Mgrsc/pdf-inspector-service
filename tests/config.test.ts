import { describe, expect, test } from "bun:test"
import { loadConfig } from "../src/config"

describe("loadConfig", () => {
  test("requires API_KEYS when auth enabled", () => {
    expect(() => loadConfig({ AUTH_DISABLED: "false" })).toThrow(/API_KEYS/)
  })

  test("parses comma-separated keys", () => {
    const config = loadConfig({ API_KEYS: "a, b:label, c" })
    expect(config.apiKeys).toEqual(["a", "b", "c"])
  })

  test("allows empty keys when AUTH_DISABLED", () => {
    const config = loadConfig({ AUTH_DISABLED: "true" })
    expect(config.authDisabled).toBe(true)
    expect(config.apiKeys).toEqual([])
  })

  test("parses limits", () => {
    const config = loadConfig({
      API_KEYS: "k",
      PORT: "4000",
      MAX_UPLOAD_BYTES: "1048576",
      MAX_PAGES: "10",
    })
    expect(config.port).toBe(4000)
    expect(config.maxUploadBytes).toBe(1048576)
    expect(config.maxPages).toBe(10)
  })
})
