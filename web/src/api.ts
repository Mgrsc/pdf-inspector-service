export type ApiErrorBody = {
  error: {
    code: string
    message: string
    requestId?: string
    details?: unknown
  }
}

export type ClassifyResult = {
  pdfType: string
  pageCount: number
  pagesNeedingOcr: number[]
  confidence: number
  requestId: string
}

export type ProcessResult = {
  pdfType: string
  markdown: string | null
  pageCount: number
  processingTimeMs: number
  pagesNeedingOcr: number[]
  confidence: number
  title: string | null
  isComplexLayout: boolean
  pagesWithTables: number[]
  pagesWithColumns: number[]
  hasEncodingIssues: boolean
  requestId: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

const KEY_STORAGE = "pdf-inspector-service-key"

export function loadStoredKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? ""
  } catch {
    return ""
  }
}

export function saveStoredKey(key: string): void {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key)
    else sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    /* ignore */
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody
    return new ApiError(
      res.status,
      body.error?.code ?? "unknown",
      body.error?.message ?? res.statusText,
      body.error?.requestId,
    )
  } catch {
    return new ApiError(res.status, "unknown", res.statusText)
  }
}

async function postPdf<T>(path: string, file: File, apiKey: string): Promise<T> {
  const form = new FormData()
  form.append("file", file)

  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  })

  if (!res.ok) {
    throw await parseError(res)
  }

  return (await res.json()) as T
}

export function classifyPdf(file: File, apiKey: string): Promise<ClassifyResult> {
  return postPdf<ClassifyResult>("/v1/classify", file, apiKey)
}

export function processPdf(file: File, apiKey: string): Promise<ProcessResult> {
  return postPdf<ProcessResult>("/v1/process", file, apiKey)
}
