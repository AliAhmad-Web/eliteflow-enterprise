# Security Feature Flags (Phase 4)

Env-based flags for EliteFlow security hardening.

- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart affected apps

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `SECURITY_ENTERPRISE_FOUNDATION` | `NEXT_PUBLIC_SECURITY_ENTERPRISE_FOUNDATION` | `false` | 1 |
| `SECURITY_HTTP_HEADERS` | `NEXT_PUBLIC_SECURITY_HTTP_HEADERS` | `false` | 1 (alias) |
| `SECURITY_HEADERS` | `NEXT_PUBLIC_SECURITY_HEADERS` | `false` | 2 |
| `SECURITY_CSP` | `NEXT_PUBLIC_SECURITY_CSP` | `false` | 2 |
| `SECURITY_SECURE_COOKIES` | `NEXT_PUBLIC_SECURITY_SECURE_COOKIES` | `false` | 1 (alias) |
| `SECURITY_SESSION_POLICIES` | `NEXT_PUBLIC_SECURITY_SESSION_POLICIES` | `false` | 1 (alias) |
| `SECURITY_EDGE_AUTH` | `NEXT_PUBLIC_SECURITY_EDGE_AUTH` | `false` | 1 (alias) |
| `SECURITY_SESSION_HARDENING` | `NEXT_PUBLIC_SECURITY_SESSION_HARDENING` | `false` | 2 |
| `SECURITY_AUDIT_ENHANCEMENT` | `NEXT_PUBLIC_SECURITY_AUDIT_ENHANCEMENT` | `false` | 1 (alias) |
| `SECURITY_MONITORING` | `NEXT_PUBLIC_SECURITY_MONITORING` | `false` | 2 |
| `SECURITY_RATE_LIMIT_HARDENING` | `NEXT_PUBLIC_SECURITY_RATE_LIMIT_HARDENING` | `false` | 1 (alias) |
| `SECURITY_RATE_LIMITING` | `NEXT_PUBLIC_SECURITY_RATE_LIMITING` | `false` | 2 |
| `SECURITY_PERMISSION_ENFORCEMENT` | `NEXT_PUBLIC_SECURITY_PERMISSION_ENFORCEMENT` | `false` | 1 (alias) |
| `SECURITY_PERMISSION_REFRESH` | `NEXT_PUBLIC_SECURITY_PERMISSION_REFRESH` | `false` | 2 |
| `SECURITY_UPLOAD_HARDENING` | `NEXT_PUBLIC_SECURITY_UPLOAD_HARDENING` | `false` | 2 |
| `SECURITY_REQUEST_VALIDATION` | `NEXT_PUBLIC_SECURITY_REQUEST_VALIDATION` | `false` | deferred |

API also reads the same names without `NEXT_PUBLIC_` for server-side controls.

### Session hint signing (optional)

| Env | Purpose |
|-----|---------|
| `SESSION_HINT_SECRET` | ≥16 chars; HMAC for hardened session-hint cookie. If unset while session hardening is ON, middleware fails open to presence check. |

## Phase 2 wiring (default OFF)

| Flag | Behavior when ON |
|------|------------------|
| `HEADERS` | Next.js security headers |
| `CSP` | `Content-Security-Policy-Report-Only` |
| `SESSION_HARDENING` | Signed session-hint + CSRF SameSite alignment (prod) |
| `RATE_LIMITING` | Stricter budgets + RateLimit-* headers + bucket eviction |
| `PERMISSION_REFRESH` | Reload permissions from DB after JWT verify |
| `UPLOAD_HARDENING` | Stricter SVG / MIME / filename checks |
| `MONITORING` | Richer authz metadata + rate-limit audit events |

## Rollback

Unset all `NEXT_PUBLIC_SECURITY_*` / `SECURITY_*` and `SESSION_HINT_SECRET` if needed; restart web + API.
