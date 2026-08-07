# Contributing

Thanks for your interest in improving **pdf-inspector-service**.

## Development setup

```bash
bun install
bun run build:web
bun test
bun run start
```

- Runtime: [Bun](https://bun.sh) ≥ 1.3  
- PDF engine: [`@firecrawl/pdf-inspector`](https://github.com/firecrawl/pdf-inspector) (native binary)

## Guidelines

1. Prefer TDD for behavior changes under `src/` and `tests/`.
2. Keep page indexes **0-based** in all public JSON and CLI `--pages`.
3. Do not commit secrets (`.env`), `node_modules`, or `web/dist`.
4. Do not add OCR engines unless the issue explicitly asks for it.
5. Match existing code style (TypeScript, no unnecessary comments).

## Pull requests

- One logical change per PR.
- Ensure `bun test` passes.
- Update `README.md` / `README.zh-CN.md` when user-facing behavior or config changes.

## Reporting issues

Use [GitHub Issues](https://github.com/Mgrsc/pdf-inspector-service/issues) with:

- What you ran (CLI / API / Docker)
- Expected vs actual behavior
- PDF type if relevant (text / scanned) — avoid uploading confidential documents
