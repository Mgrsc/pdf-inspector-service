# AGENT-README

Operational context for AI agents on [Mgrsc/pdf-inspector-service](https://github.com/Mgrsc/pdf-inspector-service).

## Purpose

Authenticated HTTP wrapper + web UI + CLI around `@firecrawl/pdf-inspector`.

- Does **not** reimplement PDF parsing
- Does **not** include OCR
- Auth: API keys via env `API_KEYS` (HTTP only; CLI is local)

## Architecture

```
Browser UI (web/) ──► Hono API (src/) ──► @firecrawl/pdf-inspector (native)
CLI (src/cli.ts)  ──► same service adapter
```

| Path | Responsibility |
|---|---|
| `src/cli.ts` | Entry: `serve` / `classify` / `process` / `text` / `pages` |
| `src/config.ts` | Env; fails closed without keys when auth enabled |
| `src/lib/auth.ts` | Key extract + timing-safe compare |
| `src/middleware/auth.ts` | Protects `/v1/*` |
| `src/services/pdf-inspector.ts` | Adapter; **0-based** pages in public JSON |
| `src/routes/v1.ts` | classify / process / extract |
| `src/app.ts` | CORS, static UI from `web/dist` |
| `web/` | React UI; sessionStorage API key |

## Commands

```bash
bun test
bun run start
bun run build:web
bun run cli -- process ./file.pdf
```

## CI

- `ci.yml` — tests on GitHub Actions
- `docker.yml` — push `ghcr.io/mgrsc/pdf-inspector-service` with `GITHUB_TOKEN`

## Out of scope

OCR engines, multi-tenant accounts, document storage DB — unless explicitly requested.
