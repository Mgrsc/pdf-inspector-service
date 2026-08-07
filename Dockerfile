# syntax=docker/dockerfile:1

# Pin patch version for reproducible builds. slim = Debian minimal + Bun.
ARG BUN_IMAGE=oven/bun:1.3.14-slim

# ---------- frontend ----------
FROM ${BUN_IMAGE} AS web-build
WORKDIR /app/web

COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile

COPY web/ ./
ENV NODE_ENV=production
RUN bun run build \
  && rm -rf node_modules

# ---------- production deps (linux host only installs matching optional natives) ----------
FROM ${BUN_IMAGE} AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production \
  && find node_modules -type f \( \
       -name '*.md' -o -name '*.markdown' -o -name 'CHANGELOG*' \
       -o -name '*.ts' ! -name '*.d.ts' \
     \) -delete 2>/dev/null || true \
  && find node_modules -type d \( \
       -name 'docs' -o -name 'example' -o -name 'examples' -o -name '__tests__' \
     \) -prune -exec rm -rf {} + 2>/dev/null || true

# ---------- runtime ----------
FROM ${BUN_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    # Avoid writing transpile cache into the container FS when read-only mounts are used
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/bun-cache

LABEL org.opencontainers.image.title="pdf-inspector-service" \
      org.opencontainers.image.description="PDF classification and Markdown extraction API/CLI" \
      org.opencontainers.image.source="https://github.com/Mgrsc/pdf-inspector-service" \
      org.opencontainers.image.url="https://github.com/Mgrsc/pdf-inspector-service" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Mgrsc"

COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun src ./src
COPY --from=web-build --chown=bun:bun /app/web/dist ./web/dist

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["bun", "-e", "const r=await fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/health'); if(!r.ok) process.exit(1)"]

ENTRYPOINT ["bun", "run", "/app/src/cli.ts"]
CMD ["serve"]
