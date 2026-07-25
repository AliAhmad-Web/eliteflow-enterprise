# Enterprise Database Review — UUID Migration

**Project:** Enterprise Business Management Web Application  
**Package:** `@enterprise/database`  
**Migration:** `20260722150000_uuid_and_user_security_fields`  
**Date:** 2026-07-22  
**Status:** Applied via incremental migration (no database recreation)

---

## Executive Summary

This review updated the authentication database foundation from **CUID (TEXT)** primary keys to **PostgreSQL native UUID** primary keys, added missing user security fields, optimized indexes for authentication workloads, and verified enterprise-grade foreign key cascade rules.

**No models were removed. No relationships were changed.**

---

## 1. Why UUID Is Preferred Over CUID

| Factor | CUID | UUID (PostgreSQL native) |
|--------|------|--------------------------|
| **Database type** | Stored as `TEXT` — no native validation | Native `UUID` type with 16-byte storage |
| **Index performance** | Larger string comparisons | Fixed-size, faster B-tree lookups |
| **Supabase compatibility** | Works but non-idiomatic | First-class support; `gen_random_uuid()` built-in |
| **Distributed generation** | Application-level only | DB-level `gen_random_uuid()` via `pgcrypto` |
| **Industry standard** | Common in Node.js apps | Enterprise PostgreSQL standard (RFC 4122) |
| **Interoperability** | Opaque string | Recognized across APIs, logs, analytics, BI tools |
| **Storage efficiency** | 25 characters (25+ bytes) | 16 bytes fixed |
| **Prisma support** | `@default(cuid())` | `@default(uuid()) @db.Uuid` — explicit PG mapping |

### Enterprise rationale

1. **PostgreSQL-native types** — Using `UUID` columns ensures the database enforces format validity at the storage layer, not only in application code.
2. **Supabase alignment** — Supabase PostgreSQL instances ship with `pgcrypto` enabled; `gen_random_uuid()` is the recommended default for primary keys.
3. **Operational tooling** — DBAs, monitoring dashboards, and log aggregation systems universally recognize UUID format.
4. **Future federation** — UUIDs simplify cross-service references, read replicas, and event sourcing without ID collision risk.
5. **JWT `sub` claim** — UUID user IDs are a natural fit for JWT subject identifiers in the auth layer.

### When CUID is acceptable

CUID remains valid for application-only identifiers that never leave the Node.js layer. For an enterprise PostgreSQL + Supabase stack with Prisma ORM, **UUID is the correct default**.

---

## 2. What Changed

### 2.1 Primary Key Strategy

All 12 models updated:

```prisma
// Before
id String @id @default(cuid())

// After
id String @id @default(uuid()) @db.Uuid
```

**Affected models:** `User`, `Role`, `Permission`, `Session`, `RefreshToken`, `OAuthAccount`, `EmailVerificationToken`, `PasswordResetToken`, `OtpVerification`, `AuditLog`, `LoginAttempt`

**Foreign keys** updated with `@db.Uuid` on all UUID-referencing columns:
- `User.roleId`, `User.companyId`
- `RolePermission.roleId`, `RolePermission.permissionId`
- `Session.userId`
- `RefreshToken.sessionId`, `RefreshToken.userId`, `RefreshToken.replacedByTokenId`
- `OAuthAccount.userId`
- `EmailVerificationToken.userId`
- `PasswordResetToken.userId`
- `OtpVerification.userId`
- `AuditLog.userId`
- `LoginAttempt.userId`

### 2.2 User Security Fields

| Field | Column | Status | Purpose |
|-------|--------|--------|---------|
| `lastLoginAt` | `last_login_at` | **Existing** | Track last successful login timestamp |
| `passwordChangedAt` | `password_changed_at` | **Added** | Enforce password rotation policies |
| `failedLoginCount` | `failed_login_count` | **Renamed** from `failed_login_attempts` | Account lockout counter |
| `lockedUntil` | `locked_until` | **Existing** | Temporary lockout expiry timestamp |

### 2.3 Index Changes

#### Added

| Index | Table | Reason |
|-------|-------|--------|
| `users_locked_until_idx` | `users` | Fast lookup for lockout expiry checks during login |

#### Removed (redundant or low-value)

| Index | Reason removed |
|-------|----------------|
| `users_company_id_idx` | `companyId` not used in auth hot path; add when multi-tenant ships |
| `users_deleted_at_idx` | Covered by composite `(email, deleted_at)` used at login |
| `sessions_revoked_at_idx` | Covered by composite `(user_id, revoked_at)` |
| `refresh_tokens_user_id_idx` | Covered by composite `(user_id, revoked_at)` |
| `permissions_resource_idx` | Covered by composite `(resource, action)` left-prefix rule |
| `email_verification_tokens_user_id_idx` | Covered by `(user_id, used_at)` |
| `password_reset_tokens_user_id_idx` | Covered by `(user_id, used_at)` |
| `otp_verifications_user_id_idx` | Covered by `(user_id, purpose)` |
| `login_attempts_user_id_created_at_idx` | `userId` is often null on failed attempts; email index is primary |
| `login_attempts_success_created_at_idx` | Low selectivity; not used in auth hot path |

#### Retained (authentication-critical)

| Index | Auth use case |
|-------|---------------|
| `users_email_key` (unique) | Login email lookup |
| `users(email, deleted_at)` | Login with soft-delete filter |
| `users(role_id)` | RBAC permission loading |
| `users(status)` | Account status gate |
| `users(locked_until)` | Lockout check |
| `refresh_tokens(token_hash)` (unique) | Token refresh lookup |
| `refresh_tokens(expires_at)` | Cleanup job |
| `sessions(user_id, revoked_at)` | Active session listing |
| `login_attempts(email, created_at)` | Rate limiting / lockout |
| `login_attempts(ip_address, created_at)` | IP-based rate limiting |
| `audit_logs(user_id, created_at)` | Security investigations |

### 2.4 Constraint Review (Verified — No Changes)

| Relationship | Rule | Rationale |
|--------------|------|-----------|
| `User` → `Role` | **RESTRICT** | Cannot delete a role while users are assigned |
| `RolePermission` → `Role`, `Permission` | **CASCADE** | Join rows removed when role/permission deleted |
| `Session` → `User` | **CASCADE** | Sessions removed when user hard-deleted |
| `RefreshToken` → `Session`, `User` | **CASCADE** | Tokens removed with session/user |
| `RefreshToken` → `RefreshToken` (rotation) | **SET NULL** | Preserve rotation chain history |
| `OAuthAccount` → `User` | **CASCADE** | OAuth links removed with user |
| Verification tokens → `User` | **CASCADE** | Tokens removed with user |
| `AuditLog` → `User` | **SET NULL** | **Immutable audit trail preserved** after user deletion |
| `LoginAttempt` → `User` | **SET NULL** | Failed attempt history preserved even if user deleted |

All rules follow enterprise best practices per ADR-020 (audit immutability) and authentication architecture.

---

## 3. Migration Impact

### Migration file

```
prisma/migrations/20260722150000_uuid_and_user_security_fields/migration.sql
```

### Apply commands

```bash
cd packages/database
npm run migrate:deploy    # production / CI
# or
npm run migrate:dev       # development

npm run seed              # required after migration if auth data existed
```

### Data impact — IMPORTANT

**CUID strings cannot be cast to UUID.** The migration:

1. Applies security field changes (non-destructive)
2. Optimizes indexes
3. **Truncates all authentication tables** before type conversion
4. Converts all `TEXT` ID columns to `UUID`
5. Restores foreign key constraints

### Post-migration action required

```bash
npm run seed
```

This restores:
- 4 system roles
- 32 permissions
- Role-permission assignments
- 4 demo users (new UUID identifiers)

---

## 4. Backward Compatibility

| Area | Impact | Mitigation |
|------|--------|------------|
| **Existing user IDs** | All CUID values invalidated | Re-seed development data; production N/A (pre-launch) |
| **JWT tokens** | Any issued tokens with CUID `sub` invalid | Force re-login after migration |
| **API responses** | IDs now UUID format (`xxxxxxxx-xxxx-...`) | Update any hardcoded CUID length assumptions |
| **Seed scripts** | No changes required | Upsert by `email`/`code`/`key`, not by ID |
| **Prisma Client** | Regenerate after schema change | `npm run generate` |
| **Foreign keys** | Same relationships, different column type | Automatic via migration |
| **Application code** | None exists yet (Phase 3 Step 2 only) | No code changes required |

### Production rollout checklist (future)

- [ ] Schedule maintenance window
- [ ] Backup database before migration
- [ ] Run migration on staging first
- [ ] Re-seed or run data migration script for production users
- [ ] Invalidate all active sessions (password reset / logout all)
- [ ] Regenerate Prisma Client in API deployment
- [ ] Verify login, refresh, and RBAC flows

---

## 5. Prisma Schema Reference

```prisma
model User {
  id                String     @id @default(uuid()) @db.Uuid
  lastLoginAt       DateTime?  @map("last_login_at")
  passwordChangedAt DateTime?  @map("password_changed_at")
  failedLoginCount  Int        @default(0) @map("failed_login_count")
  lockedUntil       DateTime?  @map("locked_until")
  roleId            String     @map("role_id") @db.Uuid
  // ...
}
```

---

## 6. Related Documents

| Document | Path |
|----------|------|
| Authentication Architecture | `docs/architecture/authentication-architecture.md` |
| Database README | `packages/database/README.md` |
| Initial migration | `prisma/migrations/20260722140000_init_authentication/` |
| UUID migration | `prisma/migrations/20260722150000_uuid_and_user_security_fields/` |

---

*This migration does not modify business logic, API endpoints, or frontend code.*
