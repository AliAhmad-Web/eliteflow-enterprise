# Security Architecture (Phase 4 — Phase 1)

**Status:** Design only. Do **not** wire production hardening in Phase 1.  
**Principle:** Reuse existing auth, RBAC, middleware, and permissions. Flag every additive control.

---

## Goals

1. Layered defense without replacing JWT/RBAC.  
2. Instant rollback via `SECURITY_*` flags (default OFF).  
3. Web and API remain independently deployable.  
4. No new security dashboards or SEO-style “security-only” routes.

---

## Control planes

```
                    ┌─────────────────────────┐
                    │  SECURITY_* feature flags│
                    │  (default OFF)           │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Next.js edge  │     │ Next.js app     │     │ Express API     │
│ middleware    │     │ headers / CSP   │     │ helmet, CSRF,   │
│ (EDGE_AUTH)   │     │ (HEADERS, CSP)  │     │ rate limit,     │
└───────────────┘     └─────────────────┘     │ authz, validate │
                                              └─────────────────┘
```

---

## 1. Security middleware (reuse + extend)

| Layer | Today | Phase 2 design |
|-------|-------|----------------|
| Web `middleware.ts` | Session-hint gate | When `SECURITY_EDGE_AUTH` ON: stronger signed/httpOnly edge signal **without** replacing `AuthGuard` |
| API `auth.middleware` | JWT verify | Unchanged contracts; optional binding checks behind flags |
| API `permission.middleware` | RBAC | Unchanged; optional freshness helpers behind `PERMISSION_ENFORCEMENT` |
| API `csrf.middleware` | Double-submit | Cookie attribute alignment behind `SECURE_COOKIES` |
| API `rate-limit.middleware` | In-memory | Store swap / stricter budgets behind `RATE_LIMIT_HARDENING` |
| API `validate.middleware` | Zod | Additional strictness behind `REQUEST_VALIDATION` |

Do not invent a parallel middleware stack.

---

## 2. HTTP security headers

**Flag:** `SECURITY_HTTP_HEADERS`

Target (web `next.config` / `headers()` when ON):

- `Strict-Transport-Security` (prod HTTPS only)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`
- `Permissions-Policy` (camera/mic/geolocation off by default)

API already uses helmet — Phase 2 may tighten only behind API-side flag equivalent; do not break JSON CORS needs.

---

## 3. CSP strategy

**Flag:** `SECURITY_CSP`

1. **Report-Only** first (collect violations).  
2. Then enforce with nonces/hashes for Next.js scripts.  
3. Allowlist API / Supabase / reCAPTCHA / font origins explicitly.  
4. Keep `frame-ancestors` locked down.  
5. JSON-LD inline scripts: prefer hash or `'strict-dynamic'` carefully — do not ban SEO JSON-LD without a plan.

Never ship enforcing CSP without a flag OFF rollback path.

---

## 4. Secure cookies

**Flag:** `SECURITY_SECURE_COOKIES`

- Document preferred topology (same-site vs cross-site web↔API).  
- Align CSRF cookie SameSite with refresh cookie requirements.  
- Keep refresh httpOnly; never move access JWT into a non-httpOnly cookie without threat review.  
- Preserve existing cookie **names** and paths unless migration plan exists (out of Phase 1).

---

## 5. Session policies

**Flag:** `SECURITY_SESSION_POLICIES`

- Reuse session table + cleanup job.  
- Optional: shorter idle timeout, absolute lifetime, concurrent session caps — gated.  
- Do not replace refresh rotation / reuse detection.

---

## 6. Audit logging

**Flag:** `SECURITY_AUDIT_ENHANCEMENT`

- Extend fields on existing `auditLog` / loginAttempt / authz denial paths.  
- No new public APIs required for Phase 2 MVP.  
- Retention remains cleanup-job driven.

---

## 7. Permission enforcement

**Flag:** `SECURITY_PERMISSION_ENFORCEMENT`

Options (pick in Phase 2, do not implement now):

- Soft-revalidate permissions from DB on sensitive mutations  
- Shorter access TTL  
- Version claim / `permissionsVersion` bump on role change  

Must not replace shared permission engine or seed matrix.

---

## 8. Request validation

**Flag:** `SECURITY_REQUEST_VALIDATION`

- Close residual Zod gaps; reject unknown keys where safe.  
- No REST contract field renames.

---

## Explicit non-goals (Phase 1)

- No CSP/header code in `next.config`  
- No cookie attribute changes  
- No JWT algorithm / secret redesign  
- No MFA / device management  
- No encryption or secret rotation automation  

---

*Architecture document only.*
