export type ErrorCode =
  | "unauthorized"
  | "validation_error"
  | "invalid_pdf"
  | "payload_too_large"
  | "unsupported_media_type"
  | "unprocessable_pdf"
  | "page_limit_exceeded"
  | "internal_error"

export class AppError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = "AppError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export function unauthorized(message = "Missing or invalid API key"): AppError {
  return new AppError(401, "unauthorized", message)
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError(400, "validation_error", message, details)
}

export function invalidPdf(message = "File is not a valid PDF"): AppError {
  return new AppError(400, "invalid_pdf", message)
}

export function payloadTooLarge(maxBytes: number): AppError {
  return new AppError(
    413,
    "payload_too_large",
    `Upload exceeds maximum size of ${maxBytes} bytes`,
    { maxUploadBytes: maxBytes },
  )
}

export function unsupportedMediaType(message: string): AppError {
  return new AppError(415, "unsupported_media_type", message)
}

export function unprocessablePdf(message: string): AppError {
  return new AppError(422, "unprocessable_pdf", message)
}

export function pageLimitExceeded(pageCount: number, maxPages: number): AppError {
  return new AppError(
    400,
    "page_limit_exceeded",
    `PDF has ${pageCount} pages; maximum allowed is ${maxPages}`,
    { pageCount, maxPages },
  )
}
