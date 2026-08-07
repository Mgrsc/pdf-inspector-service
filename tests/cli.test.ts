import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { parseArgs, runCommand, usage } from "../src/cli"

const hello = join(import.meta.dir, "fixtures", "hello.pdf")

describe("parseArgs", () => {
  test("defaults to serve", () => {
    expect(parseArgs(["bun", "cli.ts"]).command).toBe("serve")
  })

  test("parses process with output and pages", () => {
    const args = parseArgs([
      "bun",
      "cli.ts",
      "process",
      "a.pdf",
      "-o",
      "out.md",
      "--pages",
      "0,2-3",
      "--json",
    ])
    expect(args.command).toBe("process")
    expect(args.file).toBe("a.pdf")
    expect(args.output).toBe("out.md")
    expect(args.pages).toEqual([0, 2, 3])
    expect(args.json).toBe(true)
  })

  test("accepts stdin dash", () => {
    expect(parseArgs(["bun", "cli.ts", "classify", "-"]).file).toBe("-")
  })
})

describe("runCommand", () => {
  test("usage on help", () => {
    expect(usage()).toContain("docker run")
  })

  test("process returns markdown for fixture", () => {
    const chunks: string[] = []
    const original = process.stdout.write
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString())
      return true
    }) as typeof process.stdout.write

    try {
      const code = runCommand({
        command: "process",
        file: hello,
        json: false,
        help: false,
      })
      expect(code).toBe(0)
      const out = chunks.join("")
      expect(out).toContain("Hello PDF Inspector")
    } finally {
      process.stdout.write = original
    }
  })

  test("classify returns json", () => {
    const chunks: string[] = []
    const original = process.stdout.write
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString())
      return true
    }) as typeof process.stdout.write

    try {
      const code = runCommand({
        command: "classify",
        file: hello,
        json: true,
        help: false,
      })
      expect(code).toBe(0)
      const body = JSON.parse(chunks.join(""))
      expect(body.pdfType).toBe("TextBased")
      expect(body.pageCount).toBe(1)
    } finally {
      process.stdout.write = original
    }
  })
})
