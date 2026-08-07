import type { Context } from "hono"
import {
  invalidPdf,
  payloadTooLarge,
  unsupportedMediaType,
  validationError,
} from "./errors"

const PDF_MAGIC = Buffer.from("%PDF")

export async function readPdfBuffer(c: Context, maxUploadBytes: number): Promise<Buffer> {
  const contentType = c.req.header("content-type")?.toLowerCase() ?? ""

  if (contentType.includes("multipart/form-data")) {
    return readFromMultipart(c, maxUploadBytes)
  }

  if (
    contentType.includes("application/pdf") ||
    contentType.includes("application/octet-stream") ||
    contentType === ""
  ) {
    return readFromRawBody(c, maxUploadBytes)
  }

  throw unsupportedMediaType(
    "Content-Type must be application/pdf or multipart/form-data with a file field",
  )
}

async function readFromRawBody(c: Context, maxUploadBytes: number): Promise<Buffer> {
  const contentLength = c.req.header("content-length")
  if (contentLength) {
    const len = Number.parseInt(contentLength, 10)
    if (Number.isFinite(len) && len > maxUploadBytes) {
      throw payloadTooLarge(maxUploadBytes)
    }
  }

  const ab = await c.req.arrayBuffer()
  if (ab.byteLength === 0) {
    throw validationError("Request body is empty")
  }
  if (ab.byteLength > maxUploadBytes) {
    throw payloadTooLarge(maxUploadBytes)
  }

  const buf = Buffer.from(ab)
  assertPdfMagic(buf)
  return buf
}

async function readFromMultipart(c: Context, maxUploadBytes: number): Promise<Buffer> {
  let body: { file?: File | File[] | string }
  try {
    body = await c.req.parseBody({ all: true })
  } catch {
    throw validationError("Failed to parse multipart form body")
  }

  const raw = body.file
  if (!raw) {
    throw validationError('Multipart body must include a "file" field')
  }

  const file = Array.isArray(raw) ? raw[0] : raw
  if (!(file instanceof File)) {
    throw validationError('Multipart "file" field must be a file upload')
  }

  if (file.size > maxUploadBytes) {
    throw payloadTooLarge(maxUploadBytes)
  }

  const ab = await file.arrayBuffer()
  if (ab.byteLength === 0) {
    throw validationError("Uploaded file is empty")
  }

  const buf = Buffer.from(ab)
  assertPdfMagic(buf)
  return buf
}

function assertPdfMagic(buf: Buffer): void {
  if (buf.length < 5 || !buf.subarray(0, 4).equals(PDF_MAGIC)) {
    throw invalidPdf()
  }
}
