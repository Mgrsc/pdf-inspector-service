# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `0.1.x` / `main` | Yes |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

- Prefer [GitHub Security Advisories](https://github.com/Mgrsc/pdf-inspector-service/security/advisories/new) if available on the repository.
- Or contact the maintainers privately via the email listed on the [GitHub profile](https://github.com/Mgrsc).

Include steps to reproduce, impact, and any suggested fix.

## Operational notes

- Protect `/v1/*` with strong `API_KEYS` in production.
- Never set `AUTH_DISABLED=true` in production.
- Do not log PDF contents or full API keys.
- Run behind TLS (reverse proxy) when exposed to the internet.
