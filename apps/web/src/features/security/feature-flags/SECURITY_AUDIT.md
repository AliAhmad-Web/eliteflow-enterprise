# Enterprise Security Audit (Phase 4 — Phase 1)

**Scope:** Findings only. No production hardening in this phase.  
**Apps:** `apps/web`, `apps/api`, shared packages

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Authentication | Strong | JWT access + opaque refresh rotation, reuse detection |
| Authorization (RBAC) | Strong | Shared permissions; API middleware; web UX guards |
| Session management | Good | httpOnly refresh cookie; hourly cleanup job |
| JWT handling | Good | HS256, boot assert on secret length; permissions in claims |
| Refresh tokens | Strong | Hashed at rest; rotation; body refresh blocked in prod |
| Route protection | Mixed | Broad matchers; edge relies on forgeable session hint |
| API authorization | Strong | `authorizePermissions` / roles; denials audited |
| Input validation | Strong | Zod via `@enterprise/shared` + Express `validate()` |
| File upload security | Good | Size, MIME, extension, magic bytes; SVG residual risk |
| CSRF | Good | Double-submit token pattern |
| XSS / clickjacking | Mixed | Minimal `dangerouslySetInnerHTML`; API helmet; web CSP absent |
| Security headers | Partial | API helmet; no Next.js `headers()` / CSP |
| Secrets management | Good | Env-based; JWT/CORS asserts at boot |
| Logging / audit trail | Good | Login attempts, authz denials, retention cleanup |
| Rate limiting | Partial | In-memory per-route; not multi-instance safe |
| Error handling | Good | No stack traces in API JSON responses |
| Dependency risk | Deferred | Needs periodic advisory scan (Phase 2 ops) |
| Environment configuration | Good | Separate `.env`; prod CORS forbids localhost/http |

---

## 1. Authentication

**Paths:** `apps/api/src/modules/auth/*`, `config/auth.config.ts`, `middleware/auth.middleware.ts`

- Access: short-lived JWT (Bearer); claims include `sub`, `role`, `permissions`, `sessionId`
- Refresh: opaque token, SHA-256 hashed, rotated; httpOnly cookie (`__Secure-refresh-token` in prod)
- Reuse detection can revoke sessions
- `assertAuthConfig()` enforces `JWT_SECRET` length at startup

**Gap:** Access token held in client Zustand (XSS amplifies impact). **Phase 2 candidate** under session/token residency guidance (no JWT redesign required).

---

## 2. Authorization (RBAC)

**Paths:** `permission.middleware.ts`, `packages/shared` permissions engine, `RoutePermissionGuard`

- Shared `PERMISSIONS` / `ROUTE_PERMISSIONS`; seeded role matrix
- API is source of truth; web guards are UX

**Gap:** Permissions embedded in JWT → role changes lag until refresh/re-login. **Phase 2:** `SECURITY_PERMISSION_ENFORCEMENT`.

---

## 3. Session management & cookies

- Refresh cookie scoped to auth API path; `SameSite=None; Secure` in prod for cross-origin
- CSRF cookie uses stricter SameSite
- Session cleanup job (idle sessions, expired refresh, revoked sessions, aged audit logs)

**Gap:** CSRF vs refresh SameSite mismatch may cause edge cases. **Phase 2:** `SECURITY_SECURE_COOKIES`.

---

## 4. Route protection

**Paths:** `apps/web/src/middleware.ts`, `AuthGuard`, dashboard layout

- Protected prefixes aligned with product routes
- Middleware checks `auth-session-hint` presence only (non-httpOnly)

**Gap:** Hint cookie is forgeable; real auth is post-bootstrap client + API. **Phase 2:** `SECURITY_EDGE_AUTH`.

---

## 5. CSRF / XSS / clickjacking

- API: double-submit CSRF (`X-CSRF-Token`); helmet present (CSP off for JSON API)
- Web: essentially one `dangerouslySetInnerHTML` (SEO JSON-LD via `JSON.stringify` — low risk)
- Clickjacking: no explicit Next.js `X-Frame-Options` / CSP `frame-ancestors` found

**Phase 2:** `SECURITY_HTTP_HEADERS`, `SECURITY_CSP`.

---

## 6. Rate limiting

**Path:** `apps/api/src/middleware/rate-limit.middleware.ts`

- Per-route in-memory maps; auth keyed by IP+email; reCAPTCHA on sensitive auth flows

**Gap:** Not shared across API replicas. **Phase 2:** `SECURITY_RATE_LIMIT_HARDENING`.

---

## 7. File upload

**Paths:** `apps/api/src/modules/files/*`

- Multer memory; size/MIME/extension allowlists; magic-byte validation; SVG script heuristics

**Gap:** SVG remain allowlisted → residual stored XSS if served inline. **Phase 2 candidate** (policy tighten, not schema change).

---

## 8. Input validation & errors

- Zod schemas in shared package; Express validate middleware
- Unknown errors → generic 500; stacks not returned to clients

---

## 9. Secrets & environment

- Secrets via process env (JWT, OAuth, Supabase, SMTP, encryption keys)
- Production CORS rejects empty / localhost / `http://` origins

---

## 10. Logging & audit

- Auth audit + login attempts; authorization denial logging; retention cleanup (~90d)

**Phase 2:** `SECURITY_AUDIT_ENHANCEMENT` for richer fields without API contract breaks.

---

## Priority backlog (Phase 2 — design only)

1. Next.js security headers + staged CSP  
2. Stronger edge auth signal  
3. Distributed rate limiting  
4. Cookie SameSite alignment  
5. Permission freshness without replacing RBAC  
6. SVG / upload policy tighten  

---

*Audit only — no code changes to auth/RBAC/headers in Phase 1.*
