# Security Rollback Strategy (Phase 4 — Phase 1)

**Goal:** Every Phase 2 hardening control can be disabled instantly via env flags without a code rollback or DB migration.

---

## Principles

1. **Default OFF** — production matches today’s behavior until a flag is explicitly enabled.  
2. **Env-only kill switch** — unset / `false` + process restart.  
3. **No schema dependency** — hardening must not require irreversible migrations.  
4. **Independent flags** — disable CSP without disabling rate-limit hardening, etc.  
5. **Preserve auth availability** — turning flags OFF must not lock out legitimate users (avoid “fail closed” that bricks login when a new control misconfigures). Prefer fail-open to baseline for new controls.

---

## Per-control rollback

| Flag | Enable effect (Phase 2) | Rollback action | Expected baseline |
|------|-------------------------|-----------------|-------------------|
| `SECURITY_HTTP_HEADERS` | Extra Next/API headers | Unset flag, restart web/API | Pre-header responses |
| `SECURITY_CSP` | CSP report-only or enforce | Unset flag, restart web | No CSP header |
| `SECURITY_SECURE_COOKIES` | Cookie attribute changes | Unset flag, restart API | Prior SameSite/Secure set |
| `SECURITY_SESSION_POLICIES` | Stricter session limits | Unset flag, restart API | Prior idle/TTL |
| `SECURITY_AUDIT_ENHANCEMENT` | Extra audit fields | Unset flag, restart API | Prior audit shape |
| `SECURITY_RATE_LIMIT_HARDENING` | Stricter / distributed limits | Unset flag, restart API | In-memory prior limits |
| `SECURITY_REQUEST_VALIDATION` | Stricter Zod | Unset flag, restart API | Prior schemas |
| `SECURITY_PERMISSION_ENFORCEMENT` | Fresher permission checks | Unset flag, restart API | JWT claim-only checks |
| `SECURITY_EDGE_AUTH` | Stronger edge gate | Unset flag, restart web | Hint-cookie middleware |

---

## Operational checklist

1. Change only the intended `NEXT_PUBLIC_SECURITY_*` (and any API `SECURITY_*`) value.  
2. Restart the affected process(es).  
3. Verify login, refresh, CSRF, and one authenticated API call.  
4. Verify public pages still load (CSP regressions often show as blank scripts).  
5. Record the incident in ops notes; leave code on the branch — config rollback is enough.

---

## Emergency order

If users cannot sign in after enabling multiple flags:

1. Disable `SECURITY_EDGE_AUTH`  
2. Disable `SECURITY_SECURE_COOKIES`  
3. Disable `SECURITY_CSP` / `SECURITY_HTTP_HEADERS`  
4. Disable `SECURITY_RATE_LIMIT_HARDENING`  
5. Disable remaining security flags  

Then restart and confirm auth path.

---

## Phase 1 verification

With all flags unset (default): no security hardening code paths are active (Phase 1 ships flags + docs only). Rollback of Phase 1 itself is “delete unused flag docs/helpers” if ever required — helpers are inert.
