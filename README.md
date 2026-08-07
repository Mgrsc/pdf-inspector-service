# PDF Inspector Service

[![CI](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/ci.yml/badge.svg)](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/ci.yml)
[![Docker](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/docker.yml/badge.svg)](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![GHCR](https://img.shields.io/badge/image-ghcr.io%2Fmgrsc%2Fpdf--inspector--service-blue?style=flat-square)](https://github.com/Mgrsc/pdf-inspector-service/pkgs/container/pdf-inspector-service)

> Authenticated **HTTP API**, **web UI**, and **CLI** around [firecrawl/pdf-inspector](https://github.com/firecrawl/pdf-inspector) — classify PDFs and extract clean Markdown **without OCR**.

[中文文档](./README.zh-CN.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

---

## What you get

| Mode | How | Auth |
|---|---|---|
| **Web UI** | Browser → `http://host:3000/` | API key in the page |
| **HTTP API** | `POST /v1/*` | `Authorization: Bearer <key>` or `X-API-Key` |
| **CLI** | `docker run … process ./file.pdf` | Not required |

Native `@firecrawl/pdf-inspector` (Rust). **No OCR** — scanned / image-only pages appear in `pagesNeedingOcr` for external routing.

## Features

- Classification: `TextBased` / `Scanned` / `ImageBased` / `Mixed` + confidence
- Structure-aware Markdown (headings, lists, tables, multi-column)
- Plain text and per-page Markdown
- API key auth on `/v1/*`
- Upload UI (English + 中文)
- Same image for one-shot CLI

## Quick start

### Docker Compose (recommended)

Image: [`ghcr.io/mgrsc/pdf-inspector-service:latest`](https://github.com/Mgrsc/pdf-inspector-service/pkgs/container/pdf-inspector-service)

1. Set `API_KEYS` in [`docker-compose.yml`](./docker-compose.yml).
2. Pull and run:

```bash
docker compose pull
docker compose up -d
```

3. Open **http://127.0.0.1:3000/** and paste the same API key.
4. Health check (no key):

```bash
curl -sS http://127.0.0.1:3000/health
```

> First pull of a private GHCR package needs `docker login ghcr.io`. Public packages pull without login.

### Local Bun

```bash
cp .env.example .env   # set API_KEYS=...
bun install
bun run build:web
bun run start
```

Open http://127.0.0.1:3000/

## CLI

Default container command is `serve`. Override for one-shot processing:

```bash
IMAGE=ghcr.io/mgrsc/pdf-inspector-service:latest

docker run --rm -v "$PWD:/data" -w /data "$IMAGE" process ./document.pdf
docker run --rm -v "$PWD:/data" -w /data "$IMAGE" process ./document.pdf -o ./document.md
docker run --rm -v "$PWD:/data" -w /data "$IMAGE" classify ./document.pdf
docker run --rm -v "$PWD:/data" -w /data "$IMAGE" text ./document.pdf
docker run --rm -v "$PWD:/data" -w /data "$IMAGE" pages ./document.pdf
docker run --rm -i "$IMAGE" process - < ./document.pdf
docker run --rm -v "$PWD:/data" -w /data "$IMAGE" process ./document.pdf --json --pages 0,2,5-8

docker compose run --rm -v "$PWD:/data" -w /data api process /data/document.pdf
bun run cli -- process ./document.pdf
```

| Command | Default output |
|---|---|
| `serve` | HTTP + web (default) |
| `classify <file\|->` | JSON |
| `process <file\|->` | Markdown (`--json` for full result) |
| `text <file\|->` | Plain text |
| `pages <file\|->` | Per-page Markdown JSON |

Flags: `-o/--output`, `--json`, `--pages 0,2,5-8`, `-` for stdin.

## HTTP API

Public: `GET /health`, `GET /ready`, `GET /openapi.json`, static UI.

Protected: all **`/v1/*`**.

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/classify` | Document type + confidence |
| `POST` | `/v1/process` | Classify + Markdown |
| `POST` | `/v1/extract/text` | Plain text |
| `POST` | `/v1/extract/pages` | Per-page Markdown |

Body: raw `application/pdf` **or** `multipart/form-data` field `file`.

Query: `pages=0,2,5-8` · `response=markdown` on `/v1/process`.

```bash
export KEY='change-me-to-a-long-random-secret'

curl -sS -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/pdf" \
  --data-binary @document.pdf \
  http://127.0.0.1:3000/v1/classify | jq

curl -sS -H "Authorization: Bearer $KEY" \
  -F "file=@document.pdf" \
  http://127.0.0.1:3000/v1/process | jq -r .markdown
```

All page indexes in JSON are **0-based**. OpenAPI: `/openapi.json`.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `API_KEYS` | _(required for serve)_ | Comma-separated secrets; optional `key:label` |
| `AUTH_DISABLED` | `false` | Skip auth when `true` (**dev only**) |
| `PORT` | `3000` | Listen port (`0.0.0.0`) |
| `MAX_UPLOAD_BYTES` | `33554432` | Upload cap (32 MiB) |
| `MAX_PAGES` | `500` | Reject larger PDFs |
| `CORS_ORIGIN` | `*` | CORS origins |
| `LOG_LEVEL` | `info` | Log level |

See [`.env.example`](./.env.example). Compose can use inline `environment` without a `.env` file.

## Development

```bash
bun install
bun run build:web
bun test
bun run start          # CLI entry → serve
bun run dev            # hot reload
bun run web:dev        # Vite :5173, proxies /v1 → :3000
```

Requires Bun ≥ 1.3 and a platform supported by `@firecrawl/pdf-inspector`.

## CI & container image

| Workflow | Trigger | Action |
|---|---|---|
| [ci.yml](./.github/workflows/ci.yml) | push / PR | `bun test` |
| [docker.yml](./.github/workflows/docker.yml) | push `main` / tags `v*` | Build & push to **GHCR** |

Image:

```text
ghcr.io/mgrsc/pdf-inspector-service:latest
```

Auth is **only** `GITHUB_TOKEN` (no PAT). Workflow sets `permissions.packages: write`.

Also ensure: **Settings → Actions → General → Workflow permissions → Read and write**.

If you see `permission_denied: write_package` after **deleting and recreating** the repo, an **orphaned GHCR package** is blocking the new repo’s token (common GitHub issue):

1. Open https://github.com/Mgrsc?tab=packages  
2. Open package **pdf-inspector-service** → **Package settings**  
3. Either **Delete this package**, **or** under **Manage Actions access** add repository `Mgrsc/pdf-inspector-service` with **Write** (or Admin)  
4. Re-run the Docker workflow  

After the first successful publish, set package visibility to **Public** if anonymous pulls are desired:

**Repo → Packages → pdf-inspector-service → Package settings → Change visibility**.

## Troubleshooting

| Symptom | Fix |
|---|---|
| UI OK, `/v1` → 401 | Use the same string as `API_KEYS` |
| Cannot pull image | `docker login ghcr.io` or make package Public |
| Port mapped but connection fails | Pull latest image (binds `0.0.0.0`); `compose pull && up -d` |
| CLI `-o` permission denied | Mount a writable dir: `-v "$PWD:/data" -w /data` |

## License

[MIT](LICENSE). Upstream [pdf-inspector](https://github.com/firecrawl/pdf-inspector) is MIT.

## For AI agents

See [AGENT-README.md](./AGENT-README.md).
