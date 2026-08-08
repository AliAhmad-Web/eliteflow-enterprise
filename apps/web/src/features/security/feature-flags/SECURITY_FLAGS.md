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
| `SECURITY_SIEM_ENABLED` | `SIEM_ENABLED` (alias) | `false` | SIEM |

API also reads the same names without `NEXT_PUBLIC_` for server-side controls.

### Enterprise SIEM (API only — never expose secrets to the web app)

Outbound security-event export. Defaults **OFF**. Do not enable in production until a real HTTPS sink and credentials are configured.

| Env | Purpose |
|-----|---------|
| `SECURITY_SIEM_ENABLED` / `SIEM_ENABLED` | Master enable switch |
| `SIEM_PROVIDERS` | Comma list: `SPLUNK,SENTINEL,ELASTIC,QRADAR,DATADOG,GENERIC_WEBHOOK` |
| `SIEM_<PROVIDER>_ENDPOINT` / `_URL` | HTTPS ingest URL |
| `SIEM_<PROVIDER>_API_KEY` / `_HEC_TOKEN` / `_BEARER_TOKEN` | Auth credential (server-only) |
| `SIEM_<PROVIDER>_AUTH_MODE` | `API_KEY` \| `BEARER` \| `NONE` |
| `SIEM_<PROVIDER>_SIGNING_SECRET` / `SIEM_WEBHOOK_SIGNING_SECRET` | Optional outbound HMAC |
| `SIEM_REQUEST_TIMEOUT_MS` | Outbound HTTP timeout (default `10000`) |
| `SIEM_MAX_RETRIES` | Bounded retries before DLQ (default `5`) |

**Production free-tier target:** **Axiom** (Personal) via `GENERIC_WEBHOOK`  
(Better Stack was first choice; signup may be temporarily unavailable.)  
See [docs/security/SIEM_PRODUCTION.md](../../../../docs/security/SIEM_PRODUCTION.md) for account setup, Railway variables, test procedure, and disable/rotate steps.

Admin APIs: `GET /api/v1/security/siem/status`, `POST /api/v1/security/siem/test` (Admin / Super Admin).

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
