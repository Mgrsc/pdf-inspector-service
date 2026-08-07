import { describe, expect, test } from "bun:test"
import { testApp, fixture, authHeaders } from "./helpers"

const app = testApp()
const pdf = fixture("hello.pdf")
const twoPages = fixture("two-pages.pdf")
const corrupt = fixture("corrupt.pdf")

describe("POST /v1/classify", () => {
  test("classifies text-based fixture", async () => {
    const res = await app.request("/v1/classify", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: pdf,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pdfType).toBe("TextBased")
    expect(body.pageCount).toBe(1)
    expect(Array.isArray(body.pagesNeedingOcr)).toBe(true)
    expect(typeof body.confidence).toBe("number")
  })

  test("rejects non-pdf magic", async () => {
    const res = await app.request("/v1/classify", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: Buffer.from("hello world"),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe("invalid_pdf")
  })

  test("rejects corrupt pdf payload", async () => {
    const res = await app.request("/v1/classify", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: corrupt,
    })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe("unprocessable_pdf")
  })

  test("rejects oversized upload", async () => {
    const smallApp = testApp({ maxUploadBytes: 100 })
    const res = await smallApp.request("/v1/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.byteLength),
        ...authHeaders(),
      },
      body: pdf,
    })
    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.error.code).toBe("payload_too_large")
  })
})

describe("POST /v1/process", () => {
  test("returns markdown for text pdf", async () => {
    const res = await app.request("/v1/process", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: pdf,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pdfType).toBe("TextBased")
    expect(typeof body.markdown).toBe("string")
    expect(body.markdown.length).toBeGreaterThan(0)
    expect(body.markdown).toContain("Hello PDF Inspector")
    expect(body.pageCount).toBe(1)
  })

  test("response=markdown returns raw body", async () => {
    const res = await app.request("/v1/process?response=markdown", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: pdf,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type") ?? "").toContain("text/markdown")
    const text = await res.text()
    expect(text).toContain("Hello PDF Inspector")
  })

  test("accepts multipart upload", async () => {
    const form = new FormData()
    form.append("file", new File([pdf], "hello.pdf", { type: "application/pdf" }))
    const res = await app.request("/v1/process", {
      method: "POST",
      headers: authHeaders(),
      body: form,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.markdown).toContain("Hello PDF Inspector")
  })
})

describe("POST /v1/extract/text", () => {
  test("returns plain text", async () => {
    const res = await app.request("/v1/extract/text", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: pdf,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toContain("Hello PDF Inspector")
    expect(body.pageCount).toBe(1)
  })
})

describe("POST /v1/extract/pages", () => {
  test("returns per-page markdown", async () => {
    const res = await app.request("/v1/extract/pages", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: twoPages,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pages.length).toBe(2)
    expect(body.pages[0].page).toBe(0)
    expect(body.pages[1].page).toBe(1)
    expect(body.pages[0].markdown).toContain("Page One")
  })

  test("filters pages query", async () => {
    const res = await app.request("/v1/extract/pages?pages=1", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: twoPages,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pages.length).toBe(1)
    expect(body.pages[0].page).toBe(1)
  })
})

describe("page limit", () => {
  test("rejects when page count exceeds max", async () => {
    const limited = testApp({ maxPages: 1 })
    const res = await limited.request("/v1/process", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", ...authHeaders() },
      body: twoPages,
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe("page_limit_exceeded")
  })
})
