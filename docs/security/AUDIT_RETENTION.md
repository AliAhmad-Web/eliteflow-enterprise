# Audit Retention vs Session Cleanup (P1-10)

## Policy

| Record class | Retention | Auto-delete |
|--------------|-----------|-------------|
| Compliance **audit logs** (`audit_logs`, hash chain) | ~7 years (`AUDIT_LOGS` policy, 2555 days) | **No** |
| Security incidents | Compliance-oriented | Per security retention |
| Idle/absolute **sessions** | Product session lifetime | Yes — session cleanup job |
| Expired **refresh tokens** | Token TTL | Yes |
| **Revoked sessions** | `REVOKED_SESSION_RETENTION_DAYS` (30) | Yes — hard-delete old revoked rows |

## Conflict that was fixed

`TOKEN_EXPIRATION.AUDIT_LOG_RETENTION_DAYS` previously defaulted to **90**, and `cleanupExpiredSessions` deleted audit rows older than that window — contradicting the 7-year / no-auto-delete compliance policy.

**Fix:** `AUDIT_LOG_RETENTION_DAYS` defaults to **`0` (never delete)**. Session cleanup still expires sessions/tokens/revoked sessions; it **skips** audit deletion when the value is `≤ 0`.

## Ephemeral vs compliance-retained

**Ephemeral (safe to expire via session cleanup):**
- Active session rows past idle/absolute limits
- Expired refresh tokens
- Revoked session rows past retention window

**Compliance-retained (must NOT be deleted by session cleanup):**
- `AuditLog` / integrity hash-chain rows
- Records covered by `RETENTION_POLICIES.AUDIT_LOGS`

## Ops note

Do not re-enable automatic audit purge without an explicit compliance decision and a dedicated retention job that respects legal hold and the 7-year policy.
