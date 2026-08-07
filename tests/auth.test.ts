import { describe, expect, test } from "bun:test"
import { extractApiKey, keyMatches } from "../src/lib/auth"
import { testApp, fixture, authHeaders } from "./helpers"

describe("extractApiKey", () => {
  test("reads Bearer token", () => {
    expect(extractApiKey("Bearer abc123", undefined)).toBe("abc123")
  })

  test("prefers X-API-Key over Authorization", () => {
    expect(extractApiKey("Bearer other", "from-header")).toBe("from-header")
  })

  test("returns null when missing", () => {
    expect(extractApiKey(undefined, undefined)).toBeNull()
    expect(extractApiKey("Basic x", undefined)).toBeNull()
  })
})

describe("keyMatches", () => {
  test("matches configured key", () => {
    expect(keyMatches("secret", ["secret", "other"])).toBe(true)
  })

  test("rejects unknown key", () => {
    expect(keyMatches("nope", ["secret"])).toBe(false)
  })
})

describe("auth middleware", () => {
  const app = testApp()
  const pdf = fixture("hello.pdf")

  test("GET /health is public", async () => {
    const res = await app.request("/health")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("ok")
  })

  test("POST /v1/classify without key returns 401", async () => {
    const res = await app.request("/v1/classify", {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: pdf,
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("unauthorized")
    expect(body.error.requestId).toBeTruthy()
  })

  test("POST /v1/classify with wrong key returns 401", async () => {
    const res = await app.request("/v1/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        ...authHeaders("wrong-key"),
      },
      body: pdf,
    })
    expect(res.status).toBe(401)
  })

  test("POST /v1/classify with Bearer key returns 200", async () => {
    const res = await app.request("/v1/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        ...authHeaders(),
      },
      body: pdf,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pdfType).toBe("TextBased")
  })

  test("POST /v1/classify with X-API-Key returns 200", async () => {
    const res = await app.request("/v1/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-API-Key": "test-secret-key",
      },
      body: pdf,
    })
    expect(res.status).toBe(200)
  })

  test("AUTH_DISABLED allows unauthenticated access", async () => {
    const openApp = testApp({ authDisabled: true, apiKeys: [] })
    const res = await openApp.request("/v1/classify", {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: pdf,
    })
    expect(res.status).toBe(200)
  })
})
