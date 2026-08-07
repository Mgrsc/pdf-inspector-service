#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs"
import * as pdf from "./services/pdf-inspector"

const DEFAULT_MAX_PAGES = Number.parseInt(process.env.MAX_PAGES ?? "500", 10) || 500

export type CliArgs = {
  command: string
  file?: string
  output?: string
  json: boolean
  pages?: number[]
  help: boolean
}

export function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  const result: CliArgs = {
    command: "serve",
    json: false,
    help: false,
  }

  if (args.length === 0) {
    return result
  }

  const first = args[0]!
  if (first === "-h" || first === "--help" || first === "help") {
    result.help = true
    return result
  }

  const commands = new Set(["serve", "classify", "process", "text", "pages", "help"])
  let i = 0
  if (commands.has(first)) {
    result.command = first
    i = 1
  } else if (first.startsWith("-")) {
    result.command = "serve"
  } else {
    result.command = first
    i = 1
  }

  if (result.command === "help") {
    result.help = true
    return result
  }

  for (; i < args.length; i++) {
    const a = args[i]!
    if (a === "-h" || a === "--help") {
      result.help = true
    } else if (a === "--json") {
      result.json = true
    } else if (a === "-o" || a === "--output") {
      result.output = args[++i]
    } else if (a === "--pages") {
      const raw = args[++i] ?? ""
      result.pages = raw
        .split(",")
        .flatMap((part) => {
          const range = /^(\d+)-(\d+)$/.exec(part.trim())
          if (range) {
            const start = Number.parseInt(range[1]!, 10)
            const end = Number.parseInt(range[2]!, 10)
            const list: number[] = []
            for (let n = start; n <= end; n++) list.push(n)
            return list
          }
          return [Number.parseInt(part.trim(), 10)]
        })
        .filter((n) => Number.isFinite(n) && n >= 0)
    } else if (a === "-") {
      result.file = "-"
    } else if (!a.startsWith("-") && result.file === undefined) {
      result.file = a
    } else {
      throw new Error(`Unknown argument: ${a}`)
    }
  }

  return result
}

export function usage(): string {
  return `pdf-inspector-service — classify PDFs and extract Markdown

Usage:
  pdf-inspector-service serve                         Start HTTP API + web UI (default)
  pdf-inspector-service classify <file|-> [--json]
  pdf-inspector-service process  <file|-> [--json] [-o out.md] [--pages 0,2,5-8]
  pdf-inspector-service text     <file|-> [--json] [-o out.txt]
  pdf-inspector-service pages    <file|-> [--json] [--pages 0,1]

Docker examples:
  docker run --rm -p 3000:3000 IMAGE
  docker run --rm -v "$PWD:/data" -w /data IMAGE process ./doc.pdf
  docker run --rm -v "$PWD:/data" -w /data IMAGE process ./doc.pdf -o ./doc.md
  docker run --rm -i IMAGE process - < ./doc.pdf

Env (serve): API_KEYS, AUTH_DISABLED, PORT, MAX_PAGES, MAX_UPLOAD_BYTES
`
}

function readPdfInput(file: string | undefined): Buffer {
  if (!file) {
    throw new Error("Missing PDF path (or use '-' for stdin)")
  }
  if (file === "-") {
    const chunks: Buffer[] = []
    const data = readFileSync(0)
    chunks.push(data)
    const buf = Buffer.concat(chunks)
    if (buf.byteLength === 0) {
      throw new Error("stdin is empty")
    }
    return buf
  }
  return readFileSync(file)
}

function writeOut(text: string, output: string | undefined): void {
  if (output) {
    writeFileSync(output, text)
    return
  }
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`)
}

export function runCommand(args: CliArgs, maxPages = DEFAULT_MAX_PAGES): number {
  if (args.help) {
    process.stdout.write(usage())
    return 0
  }

  if (args.command === "serve") {
    return -1
  }

  const needsFile = ["classify", "process", "text", "pages"]
  if (!needsFile.includes(args.command)) {
    throw new Error(`Unknown command: ${args.command}\n\n${usage()}`)
  }

  const buffer = readPdfInput(args.file)

  switch (args.command) {
    case "classify": {
      const result = pdf.classify(buffer, maxPages)
      writeOut(JSON.stringify(result, null, args.json ? 2 : 0) + (args.json ? "\n" : "\n"), args.output)
      return 0
    }
    case "process": {
      const result = pdf.process(buffer, maxPages, args.pages)
      if (args.json) {
        writeOut(JSON.stringify(result, null, 2) + "\n", args.output)
      } else {
        writeOut(result.markdown ?? "", args.output)
      }
      return 0
    }
    case "text": {
      const result = pdf.extractText(buffer, maxPages)
      if (args.json) {
        writeOut(JSON.stringify(result, null, 2) + "\n", args.output)
      } else {
        writeOut(result.text, args.output)
      }
      return 0
    }
    case "pages": {
      const result = pdf.extractPages(buffer, maxPages, args.pages)
      writeOut(JSON.stringify(result, null, args.json ? 2 : 2) + "\n", args.output)
      return 0
    }
    default:
      throw new Error(`Unknown command: ${args.command}`)
  }
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv)
    const code = runCommand(args)
    if (code === -1) {
      const { startServer } = await import("./server")
      startServer()
      return
    }
    process.exit(code)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`${message}\n`)
    process.exit(1)
  }
}

if (import.meta.main) {
  void main()
}
