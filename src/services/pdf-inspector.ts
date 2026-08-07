import {
  classifyPdf as nativeClassify,
  processPdf as nativeProcess,
  extractText as nativeExtractText,
  extractPagesMarkdown as nativeExtractPages,
  type PdfClassification,
  type PdfResult,
  type PagesExtractionResult,
} from "@firecrawl/pdf-inspector"
import { pageLimitExceeded, unprocessablePdf } from "../lib/errors"

export type ClassifyResult = {
  pdfType: string
  pageCount: number
  pagesNeedingOcr: number[]
  confidence: number
}

export type ProcessResult = {
  pdfType: string
  markdown: string | null
  pageCount: number
  processingTimeMs: number
  pagesNeedingOcr: number[]
  ocrReasonsByPage: { page: number; reasons: string[] }[]
  title: string | null
  confidence: number
  isComplexLayout: boolean
  pagesWithTables: number[]
  pagesWithColumns: number[]
  hasEncodingIssues: boolean
}

export type PagesResult = {
  pages: {
    page: number
    markdown: string
    needsOcr: boolean
    ocrReason?: string
  }[]
  pagesWithTables: number[]
  pagesWithColumns: number[]
  pagesNeedingOcr: number[]
  ocrReasonsByPage: { page: number; reasons: string[] }[]
  isComplex: boolean
}

function wrapNativeError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err)
  throw unprocessablePdf(message)
}

function normalizeZeroIndexed(pages: number[], pageCount: number): number[] {
  return [...new Set(pages)]
    .filter((p) => Number.isInteger(p) && p >= 0 && p < pageCount)
    .sort((a, b) => a - b)
}

function normalizeOneIndexedToZero(pages: number[], pageCount: number): number[] {
  return [...new Set(pages)]
    .map((p) => (p >= 1 ? p - 1 : p))
    .filter((p) => Number.isInteger(p) && p >= 0 && p < pageCount)
    .sort((a, b) => a - b)
}

function assertPageLimit(pageCount: number, maxPages: number): void {
  if (pageCount > maxPages) {
    throw pageLimitExceeded(pageCount, maxPages)
  }
}

export function classify(buffer: Buffer, maxPages: number): ClassifyResult {
  let result: PdfClassification
  try {
    result = nativeClassify(buffer)
  } catch (err) {
    wrapNativeError(err)
  }

  assertPageLimit(result.pageCount, maxPages)

  return {
    pdfType: String(result.pdfType),
    pageCount: result.pageCount,
    pagesNeedingOcr: normalizeZeroIndexed(result.pagesNeedingOcr, result.pageCount),
    confidence: result.confidence,
  }
}

export function process(buffer: Buffer, maxPages: number, pages?: number[]): ProcessResult {
  let result: PdfResult
  try {
    result = pages ? nativeProcess(buffer, pages) : nativeProcess(buffer)
  } catch (err) {
    wrapNativeError(err)
  }

  assertPageLimit(result.pageCount, maxPages)

  return {
    pdfType: String(result.pdfType),
    markdown: result.markdown ?? null,
    pageCount: result.pageCount,
    processingTimeMs: result.processingTimeMs,
    pagesNeedingOcr: normalizeOneIndexedToZero(result.pagesNeedingOcr, result.pageCount),
    ocrReasonsByPage: (result.ocrReasonsByPage ?? []).map((entry) => ({
      page: entry.page >= 1 ? entry.page - 1 : entry.page,
      reasons: entry.reasons,
    })),
    title: result.title ?? null,
    confidence: result.confidence,
    isComplexLayout: result.isComplexLayout,
    pagesWithTables: normalizeOneIndexedToZero(result.pagesWithTables, result.pageCount),
    pagesWithColumns: normalizeOneIndexedToZero(result.pagesWithColumns, result.pageCount),
    hasEncodingIssues: result.hasEncodingIssues,
  }
}

export function extractText(buffer: Buffer, maxPages: number): { text: string; pageCount: number } {
  // Lightweight classify for pageCount + limit (avoids full markdown pipeline).
  const classification = classify(buffer, maxPages)
  let text: string
  try {
    text = nativeExtractText(buffer)
  } catch (err) {
    wrapNativeError(err)
  }
  return { text, pageCount: classification.pageCount }
}

export function extractPages(buffer: Buffer, maxPages: number, pages?: number[]): PagesResult {
  let result: PagesExtractionResult
  try {
    result = pages ? nativeExtractPages(buffer, pages) : nativeExtractPages(buffer)
  } catch (err) {
    wrapNativeError(err)
  }

  const knownCount =
    result.pages.length > 0 ? Math.max(...result.pages.map((p) => p.page)) + 1 : 1
  assertPageLimit(knownCount, maxPages)

  return {
    pages: result.pages.map((p) => ({
      page: p.page,
      markdown: p.markdown,
      needsOcr: p.needsOcr,
      ...(p.ocrReason ? { ocrReason: p.ocrReason } : {}),
    })),
    pagesWithTables: normalizeOneIndexedToZero(result.pagesWithTables, knownCount),
    pagesWithColumns: normalizeOneIndexedToZero(result.pagesWithColumns, knownCount),
    pagesNeedingOcr: normalizeOneIndexedToZero(result.pagesNeedingOcr, knownCount),
    ocrReasonsByPage: (result.ocrReasonsByPage ?? []).map((entry) => ({
      page: entry.page >= 1 ? entry.page - 1 : entry.page,
      reasons: entry.reasons,
    })),
    isComplex: result.isComplex,
  }
}
