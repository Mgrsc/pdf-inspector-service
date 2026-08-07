import { validationError } from "./errors"

export function parsePagesParam(raw: string | undefined | null): number[] | undefined {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return undefined
  }

  const pages = new Set<number>()
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean)

  for (const part of parts) {
    const range = /^(\d+)-(\d+)$/.exec(part)
    if (range) {
      const start = Number.parseInt(range[1]!, 10)
      const end = Number.parseInt(range[2]!, 10)
      if (start > end) {
        throw validationError(`Invalid page range: ${part}`)
      }
      for (let i = start; i <= end; i++) {
        if (i < 0) throw validationError(`Page indexes must be >= 0: ${part}`)
        pages.add(i)
      }
      continue
    }

    if (!/^\d+$/.test(part)) {
      throw validationError(`Invalid page selector: ${part}`)
    }
    const n = Number.parseInt(part, 10)
    if (n < 0) throw validationError(`Page indexes must be >= 0: ${part}`)
    pages.add(n)
  }

  return [...pages].sort((a, b) => a - b)
}

export function toZeroIndexedPagesNeedingOcr(
  pages: number[],
  pageCount: number,
  assumedOneIndexed: boolean,
): number[] {
  if (!assumedOneIndexed) {
    return [...new Set(pages)].filter((p) => p >= 0 && p < pageCount).sort((a, b) => a - b)
  }
  return [...new Set(pages)]
    .map((p) => p - 1)
    .filter((p) => p >= 0 && p < pageCount)
    .sort((a, b) => a - b)
}
