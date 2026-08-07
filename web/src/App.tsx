import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  ApiError,
  classifyPdf,
  loadStoredKey,
  processPdf,
  saveStoredKey,
  type ClassifyResult,
  type ProcessResult,
} from "./api"

type ResultState =
  | { kind: "classify"; data: ClassifyResult }
  | { kind: "process"; data: ProcessResult }

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export default function App() {
  const { t, i18n } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const [apiKey, setApiKey] = useState(() => loadStoredKey())
  const [keyDraft, setKeyDraft] = useState(() => loadStoredKey())
  const [keyNotice, setKeyNotice] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState<"classify" | "process" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultState | null>(null)
  const [copied, setCopied] = useState(false)

  const [showSettings, setShowSettings] = useState(false)

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("theme")) {
      return localStorage.getItem("theme") as "light" | "dark"
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark"
    }
    return "light"
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  const hasKey = apiKey.trim().length > 0

  const metrics = useMemo(() => {
    if (!result) return null
    const d = result.data
    return {
      pdfType: d.pdfType,
      pageCount: d.pageCount,
      confidence: d.confidence,
      pagesNeedingOcr: d.pagesNeedingOcr,
      processingTimeMs: result.kind === "process" ? result.data.processingTimeMs : null,
      hasEncodingIssues: result.kind === "process" ? result.data.hasEncodingIssues : null,
      markdown: result.kind === "process" ? result.data.markdown : null,
    }
  }, [result])

  const onSaveKey = () => {
    const next = keyDraft.trim()
    setApiKey(next)
    saveStoredKey(next)
    setKeyNotice(t("keySaved"))
    setTimeout(() => {
      setShowSettings(false)
      setKeyNotice(null)
    }, 1200)
  }

  const onClearKey = () => {
    setKeyDraft("")
    setApiKey("")
    saveStoredKey("")
    setKeyNotice(null)
  }

  const pickFile = (f: File | null | undefined) => {
    if (!f) return
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError(t("pdfOnly"))
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
  }

  const run = useCallback(
    async (action: "classify" | "process") => {
      if (!file) return
      if (!hasKey) {
        setError(t("keyMissing"))
        return
      }
      setLoading(action)
      setError(null)
      setCopied(false)
      try {
        if (action === "classify") {
          const data = await classifyPdf(file, apiKey)
          setResult({ kind: "classify", data })
        } else {
          const data = await processPdf(file, apiKey)
          setResult({ kind: "process", data })
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError(t("unauthorized"))
        } else if (err instanceof ApiError) {
          setError(`${err.message}${err.requestId ? ` (${err.requestId})` : ""}`)
        } else if (err instanceof Error) {
          setError(err.message)
        } else {
          setError(String(err))
        }
        setResult(null)
      } finally {
        setLoading(null)
      }
    },
    [apiKey, file, hasKey, t],
  )

  const onCopy = async () => {
    if (!metrics?.markdown) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(metrics.markdown)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = metrics.markdown
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        textArea.remove()
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
      setError(t("error") + ": Clipboard copy failed")
    }
  }

  const onDownload = () => {
    if (!metrics?.markdown) return
    const blob = new Blob([metrics.markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(file?.name ?? "document").replace(/\.pdf$/i, "")}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-12 transition-colors duration-500">
      <header className="relative z-50 mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up">
        <div>
          <p className="mb-2 font-mono text-xs font-medium tracking-[0.14em] text-accent uppercase flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse"></span>
            pdf-inspector-service
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl text-gradient pb-1">{t("title")}</h1>
          <p className="mt-3 max-w-xl text-base text-ink-muted leading-relaxed">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl border border-line bg-surface/50 backdrop-blur-md p-2 text-ink-muted hover:border-accent/50 hover:text-accent transition-all duration-300"
            title={theme === "dark" ? t("switchToLight") : t("switchToDark")}
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-300 ${
              showSettings 
                ? "border-accent text-accent bg-accent/10" 
                : "border-line bg-surface/50 text-ink-muted hover:border-accent/50 hover:text-ink backdrop-blur-md"
            }`}
          >
            {t("apiKey")} {hasKey ? "✓" : "!"}
          </button>
          <LangSelect 
            currentLang={i18n.language} 
            onChange={(l) => void i18n.changeLanguage(l)} 
          />
        </div>
      </header>

      {showSettings && (
        <section className="mb-8 rounded-2xl glass-panel p-5 sm:p-6 animate-fade-in-up transform-gpu origin-top">
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="api-key">
            {t("apiKey")}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="api-key"
              type="password"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-line/50 bg-paper/50 backdrop-blur-sm px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent transition-all duration-300 shadow-inner"
              placeholder={t("apiKeyPlaceholder")}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveKey()
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveKey}
                className="rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper transition-all duration-300 hover:bg-accent hover:scale-[1.02] active:scale-95 shadow-md"
              >
                {t("saveKey")}
              </button>
              <button
                type="button"
                onClick={onClearKey}
                className="rounded-xl border border-line bg-paper/50 backdrop-blur-sm px-5 py-3 text-sm font-medium text-ink-muted transition-all duration-300 hover:border-ink-faint hover:text-ink hover:scale-[1.02] active:scale-95"
              >
                {t("clearKey")}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-faint">{t("apiKeyHint")}</p>
          {keyNotice && <p className="mt-3 text-xs font-medium text-ok animate-fade-in-up">{keyNotice}</p>}
        </section>
      )}


      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl glass-panel p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label={t("dropTitle")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pickFile(e.dataTransfer.files?.[0])
            }}
            className={`group relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-all duration-300 overflow-hidden ${
              dragging
                ? "border-accent bg-accent/10 scale-[1.02]"
                : "border-line/60 bg-paper/30 hover:border-accent/50 hover:bg-paper/60 hover:scale-[1.01]"
            }`}
          >
            {dragging && (
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_transparent_70%)] animate-pulse-glow" />
            )}
            <div className={`mb-4 relative flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-xl font-bold transition-all duration-500 ${
              dragging ? "bg-accent text-white shadow-lg shadow-accent/40 scale-110" : "bg-surface/80 text-accent border border-line shadow-sm group-hover:scale-110 group-hover:shadow-md"
            }`}>
              PDF
            </div>
            <p className="font-semibold text-ink text-lg">{t("dropTitle")}</p>
            <p className="mt-2 text-sm text-ink-muted max-w-[200px]">{t("dropHint")}</p>
          </div>

          {file && (
            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-paper/50 backdrop-blur-sm px-4 py-4 shadow-sm animate-fade-in-up">
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-ink">{file.name}</p>
                <p className="text-xs text-ink-faint mt-0.5 font-mono">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                className="shrink-0 p-2 text-ink-muted hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                onClick={() => {
                  setFile(null)
                  setResult(null)
                  if (inputRef.current) inputRef.current.value = ""
                }}
                title={t("removeFile")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-ink">{t("actions")}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={!file || !!loading}
                onClick={() => void run("classify")}
                className="flex-1 rounded-xl border border-line/80 bg-surface/80 backdrop-blur-sm px-5 py-3.5 text-sm font-medium text-ink transition-all duration-300 enabled:hover:border-accent enabled:hover:text-accent enabled:hover:shadow-md enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === "classify" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
                    {t("extracting")}
                  </span>
                ) : (
                  t("classify")
                )}
              </button>
              <button
                type="button"
                disabled={!file || !!loading}
                onClick={() => void run("process")}
                className="flex-[2] rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-all duration-300 enabled:hover:bg-accent-dark enabled:shadow-lg enabled:shadow-accent/30 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === "process" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent"></span>
                    {t("extracting")}
                  </span>
                ) : (
                  t("process")
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-4 text-sm text-danger shadow-sm animate-fade-in-up flex items-start gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <div>
                <strong className="font-semibold">{t("error")}: </strong>
                {error}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl glass-panel p-5 sm:p-6 flex flex-col animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="mb-6 flex items-center justify-between gap-3 pb-4 border-b border-line/50">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              {t("result")}
            </h2>
            {metrics?.markdown && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onCopy()}
                  className="rounded-lg bg-surface/50 border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-all duration-300 hover:border-accent hover:text-accent hover:bg-accent/5 active:scale-95"
                >
                  {copied ? "✓ " + t("copied") : t("copy")}
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  className="rounded-lg bg-surface/50 border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-all duration-300 hover:border-accent hover:text-accent hover:bg-accent/5 active:scale-95"
                >
                  {t("download")}
                </button>
              </div>
            )}
          </div>

          {!metrics && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-line/60 bg-paper/30 py-16 text-center text-sm text-ink-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-30"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
              {t("empty")}
            </div>
          )}

          {loading && (
            <div className="flex-1 space-y-4" aria-busy="true">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-line/30 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <div className="relative h-64 overflow-hidden rounded-xl bg-line/20">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/0 via-accent/20 to-accent/0 animate-scan pointer-events-none" />
              </div>
            </div>
          )}

          {metrics && !loading && (
            <>
              <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 items-start">
                <Metric label={t("metrics.type")} value={metrics.pdfType} tooltip={t("metricsDesc.type")} />
                <Metric label={t("metrics.pages")} value={String(metrics.pageCount)} tooltip={t("metricsDesc.pages")} />
                <Metric
                  label={t("metrics.confidence")}
                  value={`${(metrics.confidence * 100).toFixed(0)}%`}
                  tooltip={t("metricsDesc.confidence")}
                />
                {metrics.processingTimeMs !== null && (
                  <Metric label={t("metrics.time")} value={`${metrics.processingTimeMs} ms`} tooltip={t("metricsDesc.time")} />
                )}
                <Metric
                  label={t("metrics.ocrPages")}
                  value={
                    metrics.pagesNeedingOcr.length
                      ? metrics.pagesNeedingOcr.join(", ")
                      : t("none")
                  }
                  tooltip={t("metricsDesc.ocrPages")}
                />
                {metrics.hasEncodingIssues !== null && (
                  <Metric
                    label={t("metrics.encoding")}
                    value={metrics.hasEncodingIssues ? t("yes") : t("no")}
                    tooltip={t("metricsDesc.encoding")}
                  />
                )}
              </dl>

              {metrics.markdown !== null && (
                <div className="flex-1 flex flex-col min-h-0 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                  <p className="mb-3 text-sm font-semibold text-ink">{t("markdown")}</p>
                  <div className="relative flex-1 rounded-xl overflow-hidden shadow-inner bg-[#0f172a] border border-line/20">
                    <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                    <pre className="h-full max-h-[32rem] overflow-auto p-5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-[#e5e7eb] selection:bg-accent/40 selection:text-white scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                      {metrics.markdown || "—"}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <footer className="mt-10 text-center text-xs text-ink-faint">
        Powered by{" "}
        <a
          className="underline-offset-2 hover:text-accent hover:underline"
          href="https://github.com/firecrawl/pdf-inspector"
          target="_blank"
          rel="noreferrer"
        >
          firecrawl/pdf-inspector
        </a>
      </footer>
    </div>
  )
}

function Metric({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  const [showTip, setShowTip] = useState(false)
  
  return (
    <div className="relative rounded-xl border border-line/60 bg-surface/50 backdrop-blur-sm px-4 py-3 shadow-sm transition-all duration-300 hover:border-accent/40 hover:shadow-md animate-fade-in-up">
      <div className="flex justify-between items-start mb-1 gap-2">
        <dt className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">{label}</dt>
        {tooltip && (
          <button 
            type="button" 
            onClick={() => setShowTip(!showTip)}
            className={`flex-shrink-0 rounded-full p-0.5 transition-colors focus:outline-none ${showTip ? 'text-accent bg-accent/10' : 'text-ink-faint hover:text-ink hover:bg-line/40'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          </button>
        )}
      </div>
      <dd className="truncate font-mono text-[15px] font-bold text-ink">{value}</dd>
      
      {showTip && tooltip && (
        <div className="mt-2 text-xs text-ink-muted leading-relaxed border-t border-line/40 pt-2 animate-fade-in-up break-words whitespace-normal">
          {tooltip}
        </div>
      )}
    </div>
  )
}

function LangSelect({ currentLang, onChange }: { currentLang: string; onChange: (lang: string) => void }) {
  const [open, setOpen] = useState(false)
  const isZh = currentLang.startsWith("zh")
  
  return (
    <div 
      className="relative flex items-center"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false)
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`rounded-xl border bg-surface/50 backdrop-blur-md pl-3 pr-8 py-2 text-sm font-medium text-ink shadow-sm outline-none transition-all duration-300 cursor-pointer text-left w-[95px] ${open ? 'border-accent' : 'border-line hover:border-accent/50'}`}
      >
        {isZh ? "中文" : "English"}
        <div className="pointer-events-none absolute right-2.5 top-1/2 text-ink-muted transition-transform duration-300" style={{ transform: `translateY(-50%) ${open ? 'rotate(180deg)' : 'rotate(0deg)'}` }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>
      
      {open && (
        <div className="absolute top-full mt-2 right-0 w-[110px] rounded-xl border border-line/60 bg-surface/90 backdrop-blur-xl p-1.5 shadow-lg z-50 animate-fade-in-up origin-top text-sm">
          <button 
            type="button" 
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!isZh ? 'bg-accent/10 text-accent font-semibold' : 'text-ink-muted hover:bg-line/40 hover:text-ink'}`}
            onClick={() => { onChange("en"); setOpen(false); }}
          >
            English
          </button>
          <button 
            type="button" 
            className={`w-full text-left px-3 py-2 rounded-lg mt-1 transition-colors ${isZh ? 'bg-accent/10 text-accent font-semibold' : 'text-ink-muted hover:bg-line/40 hover:text-ink'}`}
            onClick={() => { onChange("zh-CN"); setOpen(false); }}
          >
            中文
          </button>
        </div>
      )}
    </div>
  )
}
