# PDF Inspector Service

[![CI](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/ci.yml/badge.svg)](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/ci.yml)
[![Docker](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/docker.yml/badge.svg)](https://github.com/Mgrsc/pdf-inspector-service/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![GHCR](https://img.shields.io/badge/image-ghcr.io%2Fmgrsc%2Fpdf--inspector--service-blue?style=flat-square)](https://github.com/Mgrsc/pdf-inspector-service/pkgs/container/pdf-inspector-service)

> 基于 [firecrawl/pdf-inspector](https://github.com/firecrawl/pdf-inspector) 的鉴权 **HTTP API**、**Web UI** 与 **CLI** —— 智能分类 PDF，提取干净 Markdown（**不含 OCR**）。

[English](./README.md) · [贡献指南](./CONTRIBUTING.md) · [安全说明](./SECURITY.md)

---

## 你能得到什么

| 模式 | 用法 | 鉴权 |
|---|---|---|
| **Web UI** | 浏览器 `http://主机:3000/` | 页面填写 API Key |
| **HTTP API** | `POST /v1/*` | `Authorization: Bearer <key>` 或 `X-API-Key` |
| **CLI** | `docker run … process ./file.pdf` | 不需要 |

底层原生 `@firecrawl/pdf-inspector`（Rust）。**不做 OCR**；扫描件/纯图页见 `pagesNeedingOcr`。

## 功能

- 分类：`TextBased` / `Scanned` / `ImageBased` / `Mixed` + 置信度
- 结构感知 Markdown（标题、列表、表格、多栏）
- 纯文本与按页 Markdown
- `/v1/*` API Key 鉴权
- 上传 UI（中 / 英）
- 同一镜像支持 CLI 一次性处理

## 快速开始

### Docker Compose（推荐）

镜像：[`ghcr.io/mgrsc/pdf-inspector-service:latest`](https://github.com/Mgrsc/pdf-inspector-service/pkgs/container/pdf-inspector-service)

1. 修改 [`docker-compose.yml`](./docker-compose.yml) 中的 `API_KEYS`。
2. 拉取并启动：

```bash
docker compose pull
docker compose up -d
```

3. 打开 **http://127.0.0.1:3000/**，填入相同 API Key。
4. 健康检查（无需 Key）：

```bash
curl -sS http://127.0.0.1:3000/health
```

> 若 GHCR 包为私有，需先 `docker login ghcr.io`。公开包可直接 pull。

### 本地 Bun

```bash
cp .env.example .env   # 设置 API_KEYS=...
bun install
bun run build:web
bun run start
```

打开 http://127.0.0.1:3000/

## CLI

容器默认命令为 `serve`。覆盖命令即可一次性处理：

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

| 命令 | 默认输出 |
|---|---|
| `serve` | HTTP + Web（默认） |
| `classify <file\|->` | JSON |
| `process <file\|->` | Markdown（`--json` 为完整结果） |
| `text <file\|->` | 纯文本 |
| `pages <file\|->` | 按页 Markdown JSON |

参数：`-o/--output`、`--json`、`--pages 0,2,5-8`、`-` 表示 stdin。

## HTTP API

公开：`GET /health`、`GET /ready`、`GET /openapi.json`、静态 UI。

受保护：全部 **`/v1/*`**。

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/v1/classify` | 文档类型 + 置信度 |
| `POST` | `/v1/process` | 分类 + Markdown |
| `POST` | `/v1/extract/text` | 纯文本 |
| `POST` | `/v1/extract/pages` | 按页 Markdown |

请求体：原始 `application/pdf`，或 `multipart/form-data` 字段 `file`。

查询：`pages=0,2,5-8` · `/v1/process` 可用 `response=markdown`。

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

JSON 页码均为 **0 起**。OpenAPI：`/openapi.json`。

## 配置

| 变量 | 默认 | 说明 |
|---|---|---|
| `API_KEYS` | _(serve 时必填)_ | 逗号分隔密钥；可选 `key:label` |
| `AUTH_DISABLED` | `false` | `true` 关闭鉴权（**仅开发**） |
| `PORT` | `3000` | 监听端口（`0.0.0.0`） |
| `MAX_UPLOAD_BYTES` | `33554432` | 上传上限 32 MiB |
| `MAX_PAGES` | `500` | 超过页数拒绝 |
| `CORS_ORIGIN` | `*` | CORS |
| `LOG_LEVEL` | `info` | 日志级别 |

见 [`.env.example`](./.env.example)。Compose 可直接写 `environment`，不必再维护 `.env`。

## 开发

```bash
bun install
bun run build:web
bun test
bun run start
bun run dev
bun run web:dev
```

需要 Bun ≥ 1.3，以及 `@firecrawl/pdf-inspector` 支持的平台。

## CI 与容器镜像

| 工作流 | 触发 | 作用 |
|---|---|---|
| [ci.yml](./.github/workflows/ci.yml) | push / PR | `bun test` |
| [docker.yml](./.github/workflows/docker.yml) | push `main` / 标签 `v*` | 构建并推送到 **GHCR** |

镜像：

```text
ghcr.io/mgrsc/pdf-inspector-service:latest
```

鉴权**只用** `GITHUB_TOKEN`（不需要额外 PAT）。workflow 已声明 `permissions.packages: write`。

另确认：**Settings → Actions → General → Workflow permissions → Read and write**。

若出现 `permission_denied: write_package`，且你曾经**删库又同名重建**，多半是旧的 **GHCR 包残留**，新仓库的 `GITHUB_TOKEN` 对它没有写权限（GitHub 常见问题）：

1. 打开 https://github.com/Mgrsc?tab=packages  
2. 进入包 **pdf-inspector-service** → **Package settings**  
3. **删除该包**，或在 **Manage Actions access** 里把仓库 `Mgrsc/pdf-inspector-service` 加成 **Write/Admin**  
4. 重新跑 Docker workflow  

首次推送成功后，若需匿名拉取，将 Package 设为 **Public**：

**仓库 → Packages → pdf-inspector-service → Package settings → Change visibility**。

## 排错

| 现象 | 处理 |
|---|---|
| UI 正常，`/v1` 401 | Key 必须与 `API_KEYS` 一致 |
| 拉不下镜像 | `docker login ghcr.io` 或将包设为 Public |
| 端口映射了却连不上 | 拉取最新镜像（监听 `0.0.0.0`）后 `compose pull && up -d` |
| CLI `-o` 权限错误 | 挂载可写目录：`-v "$PWD:/data" -w /data` |

## 许可证

[MIT](LICENSE)。上游 [pdf-inspector](https://github.com/firecrawl/pdf-inspector) 同为 MIT。

## AI Agent

见 [AGENT-README.md](./AGENT-README.md)。
