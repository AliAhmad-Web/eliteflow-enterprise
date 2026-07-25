# Phase 3 — Authentication Architecture

**Project:** Enterprise Business Management Web Application  
**Version:** 1.0  
**Status:** Architecture Blueprint (Documentation Only — No Implementation)  
**Date:** 2026-07-22  
**Authors:** Backend Architecture & Security Engineering Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [System Context](#3-system-context)
4. [Authentication Flows](#4-authentication-flows)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [Token Strategy](#6-token-strategy)
7. [Session Management](#7-session-management)
8. [Security](#8-security)
9. [Database Planning](#9-database-planning)
10. [API Planning](#10-api-planning)
11. [Frontend Planning](#11-frontend-planning)
12. [Backend Module Structure](#12-backend-module-structure)
13. [Best Practices](#13-best-practices)
14. [Enterprise Security Rules](#14-enterprise-security-rules)
15. [Related Documents](#15-related-documents)

---

## 1. Overview

Phase 3 introduces a **production-grade authentication and authorization system** for a multi-role enterprise SaaS platform. Authentication is the security boundary between public marketing pages and protected business modules (clients, projects, invoices, AI, files, etc.).

### Goals

| Goal | Description |
|------|-------------|
| **Secure by default** | Defense in depth across frontend, API, and database layers |
| **Enterprise-ready** | Audit logs, session control, rate limiting, account lifecycle |
| **Scalable** | Stateless API authorization via JWT; horizontal API scaling |
| **Role-aware** | Four distinct roles with permission-level granularity |
| **Developer-friendly** | Shared Zod schemas, typed contracts, feature-based modules |

### Non-Goals (Phase 3)

- Business module APIs (clients, projects, invoices)
- Role-specific dashboard UI (Phase 4)
- SSO/SAML enterprise IdP integration (future phase)
- Biometric or hardware key authentication (future phase)

### Approved Stack (Auth Layer)

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Frontend** | Next.js App Router, React Hook Form, Zod | Auth pages, route protection, token handling |
| **API** | Node.js + Express | Credential validation, token issuance, RBAC enforcement |
| **Database** | PostgreSQL + Prisma | Users, sessions, tokens, roles, permissions, audit logs |
| **Platform** | Supabase | OAuth (Google, GitHub), email delivery hooks, optional RLS |
| **Tokens** | JWT (access) + opaque refresh tokens | Stateless API auth with revocable sessions |

### Alignment with ADRs

| ADR | Decision | Auth Impact |
|-----|----------|-------------|
| ADR-009 | PostgreSQL via Supabase | Auth data stored in Postgres; Supabase handles OAuth |
| ADR-014 | JWT + Refresh Tokens | Core token strategy for this document |
| ADR-015 | RBAC with permissions | Authorization model for all protected resources |
| ADR-013 | Zod validation | All auth request/response contracts validated |
| ADR-020 | Logging & audit logs | All auth events audited |

---

## 2. Architecture Principles

1. **Backend is the source of truth** — The Express API validates credentials, issues tokens, and enforces RBAC. The frontend never trusts client-side role checks alone.
2. **Short-lived access, long-lived refresh** — Minimize exposure window while preserving UX.
3. **Refresh token rotation** — Every refresh invalidates the previous token; reuse detection triggers session revocation.
4. **Supabase for OAuth only** — Social login flows through Supabase Auth; our API issues application JWTs after identity verification.
5. **Permissions in JWT, roles in database** — Access token carries role + permissions; role changes take effect on next refresh (max 15 minutes).
6. **Fail closed** — Missing, invalid, or expired tokens result in `401 Unauthorized`. Missing permissions result in `403 Forbidden`.
7. **Audit everything security-relevant** — Login, logout, failed attempts, password changes, session revocations.
8. **No secrets in the browser** — Refresh tokens in HttpOnly cookies; access tokens in memory only.

---

## 3. System Context

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │ Auth Pages   │  │ Dashboard    │  │ Auth State (Zustand + Context)│ │
│  │ (auth group) │  │ (protected)  │  │ Access token in memory        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬───────────────┘ │
│         │                 │                          │                  │
│         └─────────────────┼──────────────────────────┘                  │
│                           │                                             │
│              Next.js Middleware (route guard)                           │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXPRESS API (apps/api)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ Auth Module │  │ RBAC         │  │ Rate Limit │  │ Audit Log     │  │
│  │ Controller  │  │ Middleware   │  │ Middleware │  │ Service       │  │
│  └──────┬──────┘  └──────────────┘  └────────────┘  └───────────────┘  │
└─────────┼───────────────────────────────────────────────────────────────┘
          │
          ├──────────────────────┬──────────────────────┐
          ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ PostgreSQL       │  │ Supabase Auth    │  │ Email Service    │
│ (Prisma)         │  │ Google / GitHub  │  │ (Resend / SMTP)  │
│ Users, Sessions, │  │ OAuth flows      │  │ Verification,    │
│ Tokens, RBAC     │  │                  │  │ Reset, OTP       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Request Authorization Flow

```
Client Request
    │
    ├─► Authorization: Bearer <access_token>
    │
    ▼
auth.middleware.ts
    │
    ├─ Verify JWT signature (JWT_SECRET)
    ├─ Check expiry (exp claim)
    ├─ Extract sub, role, permissions
    │
    ▼
role.middleware.ts / permission.middleware.ts
    │
    ├─ Route requires role? → check role claim
    ├─ Route requires permission? → check permissions array
    │
    ▼
Controller → Service → Repository → Prisma → PostgreSQL
```

### Token Storage Model

| Token | Storage Location | Accessible by JS | Sent Automatically |
|-------|-----------------|------------------|-------------------|
| Access Token | In-memory (Zustand / React context) | Yes (intentional) | No — attached per request |
| Refresh Token | HttpOnly, Secure, SameSite=Strict cookie | No | Yes — on `/auth/refresh` only |

---

## 4. Authentication Flows

### 4.1 Signup (Email + Password)

**Purpose:** Register a new user account with email verification before full access.

**Actors:** User, Web App, Express API, PostgreSQL, Email Service

**Preconditions:**
- Email not already registered
- Password meets complexity policy
- Signup enabled (configurable; may be invite-only in enterprise mode)

**Flow:**

```
User → Web: Fill signup form (email, password, name, role request*)
Web → API: POST /api/v1/auth/signup
API:
  1. Validate input (Zod)
  2. Check email uniqueness
  3. Hash password (Argon2id)
  4. Create User record (status: PENDING_VERIFICATION)
  5. Assign default role (CLIENT unless invite specifies otherwise)
  6. Generate email verification token (hashed, single-use, 24h expiry)
  7. Send verification email
  8. Write audit log: auth.signup
API → Web: 201 { message: "Check your email to verify" }
Web → User: Show "Verify your email" screen

* Role assignment on self-signup defaults to CLIENT.
  Admin-created users may receive ADMIN or EMPLOYEE via invite flow.
```

**Post-signup state:** User cannot access dashboard until email is verified.

**Security controls:** Rate limit (5 signups/hour/IP), password strength validation, generic response (no email enumeration on success message policy — see §8).

---

### 4.2 Login (Email + Password)

**Purpose:** Authenticate user and establish a device session.

**Flow:**

```
User → Web: Submit login form
Web → API: POST /api/v1/auth/login
API:
  1. Validate input (Zod)
  2. Rate limit check (IP + email)
  3. Find user by email
  4. Verify password hash (constant-time compare)
  5. Check account status (ACTIVE, not LOCKED, not DELETED)
  6. Check email_verified = true
  7. If MFA/OTP required → return { requiresOtp: true, otpSessionId }
  8. Create Session record (device fingerprint, IP, user agent)
  9. Issue access token (JWT, 15 min)
  10. Issue refresh token (opaque, 7 days) → Set HttpOnly cookie
  11. Write audit log: auth.login
API → Web: 200 { user, accessToken, expiresIn }
Web:
  - Store accessToken in memory (auth store)
  - Redirect to role-appropriate dashboard
```

**Failed login handling:**
- Increment `failed_login_attempts` counter
- Lock account after 5 consecutive failures (15-minute lockout)
- Audit log: `auth.failed_login` with reason code (no password in log)
- Generic error message: "Invalid email or password"

---

### 4.3 Logout

**Purpose:** Terminate the current device session and invalidate refresh token.

**Flow:**

```
User → Web: Click "Logout"
Web → API: POST /api/v1/auth/logout (with refresh cookie + access token)
API:
  1. Verify access token (or accept refresh-only for expired access)
  2. Revoke current Session record (set revokedAt)
  3. Invalidate associated RefreshToken record
  4. Clear refresh token cookie
  5. Write audit log: auth.logout
API → Web: 200 { message: "Logged out" }
Web:
  - Clear access token from memory
  - Redirect to /login
```

---

### 4.4 Refresh Token

**Purpose:** Obtain a new access token without re-authentication.

**Flow:**

```
Web (interceptor): Access token expired on API call → 401
Web → API: POST /api/v1/auth/refresh (refresh cookie sent automatically)
API:
  1. Read refresh token from HttpOnly cookie
  2. Hash and lookup in RefreshToken table
  3. Validate: not expired, not revoked, session active
  4. ROTATION: Revoke old refresh token
  5. Issue new access token (JWT, 15 min)
  6. Issue new refresh token → Set new HttpOnly cookie
  7. Update Session.lastActiveAt
API → Web: 200 { accessToken, expiresIn }
Web: Update in-memory access token, retry original request
```

**Reuse detection (token theft):**
If a revoked refresh token is presented again → revoke entire session family → force re-login on all devices using that session chain → audit log: `auth.token_reuse_detected`.

---

### 4.5 Forgot Password

**Purpose:** Initiate password reset without revealing whether email exists.

**Flow:**

```
User → Web: Enter email on /forgot-password
Web → API: POST /api/v1/auth/forgot-password
API:
  1. Rate limit (3 requests/hour/email)
  2. If user exists:
     a. Generate password reset token (hashed, single-use, 1h expiry)
     b. Invalidate previous reset tokens for user
     c. Send reset email with link: /reset-password?token=<token>
     d. Audit log: auth.password_reset_requested
  3. Always return 200: "If an account exists, a reset link has been sent"
API → Web: 200 (same message regardless)
```

**Anti-enumeration:** Response is identical whether email exists or not.

---

### 4.6 Reset Password

**Purpose:** Set a new password using a valid reset token.

**Flow:**

```
User → Web: Click email link → /reset-password?token=xxx
Web → API: POST /api/v1/auth/reset-password { token, newPassword }
API:
  1. Validate password (Zod + complexity policy)
  2. Hash token, lookup PasswordResetToken
  3. Validate: not expired, not used
  4. Hash new password (Argon2id)
  5. Update User.passwordHash
  6. Mark token as used
  7. Revoke ALL sessions and refresh tokens for user (force re-login everywhere)
  8. Audit log: auth.password_reset_completed
API → Web: 200 { message: "Password updated. Please log in." }
Web → Redirect to /login
```

---

### 4.7 Email Verification

**Purpose:** Confirm user owns the email address before granting full access.

**Flow (link-based):**

```
User → Email: Click verification link
Web → API: POST /api/v1/auth/verify-email { token }
  OR
Web → API: GET /api/v1/auth/verify-email?token=xxx (redirect flow)
API:
  1. Hash token, lookup EmailVerificationToken
  2. Validate: not expired, not used, matches user
  3. Set User.emailVerified = true, emailVerifiedAt = now
  4. Mark token as used
  5. Audit log: auth.email_verified
API → Web: 200 → Redirect to /login or auto-login
```

**Resend verification:**

```
Web → API: POST /api/v1/auth/resend-verification { email }
Rate limit: 3/hour/email
Same anti-enumeration response policy as forgot password
```

---

### 4.8 OTP Verification

**Purpose:** Second-factor verification for login, sensitive actions, or passwordless login (future).

**Use cases in Phase 3:**

| Scenario | OTP Delivery | Code Length | Expiry |
|----------|-------------|-------------|--------|
| Login 2FA (optional per user) | Email | 6 digits | 10 minutes |
| Sensitive action confirmation | Email | 6 digits | 5 minutes |
| Account recovery (alternative) | Email | 6 digits | 10 minutes |

**Flow:**

```
API (after password validated): Return { requiresOtp: true, otpSessionId }
User → Web: Enter 6-digit OTP on /verify-otp
Web → API: POST /api/v1/auth/verify-otp { otpSessionId, code }
API:
  1. Lookup OtpVerification record by session ID
  2. Validate: not expired, attempts < 3, code matches (hashed)
  3. On failure: increment attempts; lock after 3 failures
  4. On success: mark OTP used, complete login (issue tokens)
  5. Audit log: auth.otp_verified or auth.otp_failed
```

**Security:** OTP stored hashed (never plaintext). Max 3 verification attempts per OTP session.

---

### 4.9 Session Expiration

**Purpose:** Define when users must re-authenticate.

| Event | Behavior |
|-------|----------|
| Access token expires (15 min) | Silent refresh via refresh token |
| Refresh token expires (7 days) | Redirect to login; show "Session expired" |
| Refresh token revoked (logout) | Redirect to login |
| Password changed | All sessions revoked immediately |
| Account deactivated | All sessions revoked; login rejected |
| Idle timeout (optional, 30 days) | Session marked expired if no activity |
| Token reuse detected | All sessions in family revoked |

**Frontend handling:**

```
API returns 401 (token expired) → attempt refresh
Refresh succeeds → retry request
Refresh fails (401/403) → clear auth state → redirect /login?reason=session_expired
```

---

### 4.10 Social Login (Google / GitHub) — Phase 3 Scope

**Purpose:** OAuth login via Supabase Auth; application issues JWT after identity proof.

**Flow:**

```
User → Web: Click "Continue with Google/GitHub"
Web → Supabase Auth: Initiate OAuth redirect
Supabase → Provider: OAuth consent
Provider → Supabase: Authorization code
Supabase → Web: Callback with Supabase session
Web → API: POST /api/v1/auth/oauth/callback { provider, supabaseAccessToken }
API:
  1. Verify Supabase token with Supabase Admin API
  2. Extract provider identity (email, provider ID, avatar)
  3. Find or create User (link OAuthAccount record)
  4. Set emailVerified = true (provider-verified email)
  5. Create session, issue JWT + refresh token
  6. Audit log: auth.oauth_login
API → Web: 200 { user, accessToken }
Web → Redirect to dashboard
```

**Account linking:** If email already exists with password auth, prompt user to link accounts (requires password confirmation).

---

## 5. Role-Based Access Control (RBAC)

### 5.1 Authorization Model

```
User ──(1:1)──► Role ──(M:N)──► Permission ──► Resource Action
```

- Each user has **exactly one role** at a time (role change is audited).
- Each role has **many permissions**.
- Permissions follow the convention: `[resource]:[action]`.

### 5.2 Roles

| Role | Code | Description | Dashboard Route |
|------|------|-------------|-----------------|
| **Super Admin** | `SUPER_ADMIN` | Platform-wide access. All tenants, system settings, audit logs. | `/admin` |
| **Admin** | `ADMIN` | Company-level management. Employees, clients, billing, reports. | `/dashboard` |
| **Employee** | `EMPLOYEE` | Assigned work. Tasks, projects, limited client visibility. | `/dashboard` |
| **Client** | `CLIENT` | Portal access. Own projects, invoices, documents only. | `/portal` |

### 5.3 Permission Matrix

#### System & Admin

| Permission | Super Admin | Admin | Employee | Client |
|------------|:-----------:|:-----:|:--------:|:------:|
| `system:manage` | ✅ | ❌ | ❌ | ❌ |
| `audit:read` | ✅ | ✅ | ❌ | ❌ |
| `settings:manage` | ✅ | ✅ | ❌ | ❌ |
| `team:manage` | ✅ | ✅ | ❌ | ❌ |
| `team:read` | ✅ | ✅ | ✅ | ❌ |
| `users:manage` | ✅ | ✅ | ❌ | ❌ |

#### Business Modules

| Permission | Super Admin | Admin | Employee | Client |
|------------|:-----------:|:-----:|:--------:|:------:|
| `clients:read` | ✅ | ✅ | ✅ (assigned) | ❌ |
| `clients:write` | ✅ | ✅ | ❌ | ❌ |
| `clients:delete` | ✅ | ✅ | ❌ | ❌ |
| `projects:read` | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| `projects:write` | ✅ | ✅ | ✅ (assigned) | ❌ |
| `projects:delete` | ✅ | ✅ | ❌ | ❌ |
| `tasks:read` | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| `tasks:write` | ✅ | ✅ | ✅ (assigned) | ❌ |
| `tasks:delete` | ✅ | ✅ | ❌ | ❌ |
| `invoices:read` | ✅ | ✅ | ❌ | ✅ (own) |
| `invoices:write` | ✅ | ✅ | ❌ | ❌ |
| `invoices:send` | ✅ | ✅ | ❌ | ❌ |
| `invoices:delete` | ✅ | ✅ | ❌ | ❌ |
| `reports:read` | ✅ | ✅ | ❌ | ❌ |
| `reports:export` | ✅ | ✅ | ❌ | ❌ |
| `calendar:read` | ✅ | ✅ | ✅ | ✅ (own) |
| `calendar:write` | ✅ | ✅ | ✅ | ❌ |
| `files:read` | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| `files:upload` | ✅ | ✅ | ✅ | ❌ |
| `files:delete` | ✅ | ✅ | ❌ | ❌ |
| `ai:use` | ✅ | ✅ | ✅ | ❌ |
| `notifications:read` | ✅ | ✅ | ✅ | ✅ |
| `chat:write` | ✅ | ✅ | ✅ | ✅ |

> **Note:** `(assigned)` and `(own)` denote **data-scoping rules** enforced at the service/repository layer, not just permission checks. A user may have `projects:read` but only see records linked to them.

### 5.4 Enforcement Layers

| Layer | Mechanism | File Location |
|-------|-----------|---------------|
| **Edge / Route** | Next.js Middleware — redirect unauthenticated users | `apps/web/src/middleware.ts` |
| **Layout** | Route group guards — `(dashboard)`, `(admin)`, `(portal)` | `app/(dashboard)/layout.tsx` |
| **Navigation** | Role-filtered sidebar items | `config/navigation.config.ts` |
| **Component** | `usePermissions()` hook — hide unauthorized UI | `hooks/use-permissions.ts` |
| **API Route** | `auth.middleware.ts` — JWT verification | `apps/api/src/middleware/` |
| **API Authorization** | `role.middleware.ts`, `permission.middleware.ts` | `apps/api/src/middleware/` |
| **Data Layer** | Repository scoping by `userId`, `companyId`, `clientId` | `*.repository.ts` |
| **Database (defense-in-depth)** | Supabase RLS policies (secondary) | Supabase Dashboard |

### 5.5 Access Flow by Role

```
                    ┌─────────────┐
                    │   Login     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        SUPER_ADMIN      ADMIN       EMPLOYEE
              │            │            │
              ▼            ▼            ▼
          /admin      /dashboard   /dashboard
         (full)      (company)    (assigned)
              │            │            │
              │            │            ▼
              │            │         CLIENT
              │            │            │
              │            │            ▼
              │            │        /portal
              │            │         (own)
              └────────────┴────────────┘
                    All routes protected
                    by middleware + RBAC
```

### 5.6 Privilege Escalation Prevention

| Threat | Mitigation |
|--------|------------|
| Client calls Admin API | `permission.middleware.ts` rejects with 403 |
| Employee modifies role in JWT | JWT signed server-side; tampering fails verification |
| User self-assigns ADMIN on signup | Signup defaults to CLIENT; role changes require `users:manage` |
| Token replay after logout | Refresh token revoked in database |
| IDOR on client data | Repository filters by ownership/assignment |

---

## 6. Token Strategy

### 6.1 Access Token (JWT)

| Property | Value |
|----------|-------|
| **Format** | JWT (RS256 or HS256 — HS256 for Phase 3, RS256 for multi-service future) |
| **Lifetime** | 15 minutes |
| **Storage** | In-memory only (Zustand auth store) |
| **Transport** | `Authorization: Bearer <token>` header |
| **Signing key** | `JWT_SECRET` (env, rotated quarterly) |
| **Revocable** | No (mitigated by short lifetime) |

**Payload claims:**

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID (CUID) |
| `email` | string | User email |
| `role` | string | Role code (e.g., `ADMIN`) |
| `permissions` | string[] | Flattened permission list |
| `sessionId` | string | Device session ID |
| `iat` | number | Issued at (Unix timestamp) |
| `exp` | number | Expiry (Unix timestamp) |
| `iss` | string | Issuer (`enterprise-bms-api`) |
| `aud` | string | Audience (`enterprise-bms-web`) |

### 6.2 Refresh Token

| Property | Value |
|----------|-------|
| **Format** | Opaque random string (256-bit, base64url) |
| **Lifetime** | 7 days (configurable: 1–30 days) |
| **Storage** | PostgreSQL `RefreshToken` table (hashed) |
| **Client storage** | HttpOnly, Secure, SameSite=Strict cookie |
| **Cookie name** | `__Secure-refresh-token` (production) |
| **Revocable** | Yes — per session or all sessions |

### 6.3 Expiration Summary

| Token / Artifact | Lifetime | Renewable |
|------------------|----------|-----------|
| Access Token (JWT) | 15 minutes | Via refresh |
| Refresh Token | 7 days | Via rotation (extends on use) |
| Email Verification Token | 24 hours | Resend (invalidates previous) |
| Password Reset Token | 1 hour | Re-request (invalidates previous) |
| OTP Code | 5–10 minutes | Re-request (max 3 attempts) |
| Account Lockout | 15 minutes | Auto-unlock |
| Session (idle) | 30 days inactive | Expires if no refresh |

### 6.4 Rotation Strategy

```
Login → RT₁ issued
Refresh → RT₁ revoked, RT₂ issued
Refresh → RT₂ revoked, RT₃ issued
...
If RT₁ presented after revocation → REUSE DETECTED → revoke session family
```

**Rotation rules:**
1. Each refresh invalidates the previous refresh token atomically (database transaction).
2. New refresh token inherits the same `sessionId`.
3. Maximum rotation chain: unlimited within 7-day window.
4. On reuse detection: revoke session, all tokens in family, audit alert.

### 6.5 Revocation Triggers

| Event | What's Revoked |
|-------|----------------|
| Logout (current device) | Current session + its refresh token |
| Logout all devices | All sessions + all refresh tokens for user |
| Password change | All sessions + all refresh tokens |
| Password reset | All sessions + all refresh tokens |
| Account deactivation | All sessions + all refresh tokens |
| Admin force logout | Target user's sessions |
| Token reuse detected | Entire session family |
| Role change | Sessions refreshed on next token rotation (permissions updated) |

---

## 7. Session Management

### 7.1 Device Sessions

Each successful login (password, OTP completion, or OAuth) creates a **Session** record representing one device/browser, plus a refresh-token chain bound to that session.

**Session attributes (persisted):**

| Field | Description |
|-------|-------------|
| `id` | Unique session ID (included in JWT `sessionId` claim) |
| `userId` | Owner |
| `deviceName` | Friendly name from UA parse (user-renamable) |
| `ipAddress` | Client IP at login / last known |
| `userAgent` | Raw user agent string |
| `lastActiveAt` | Updated on each successful refresh |
| `createdAt` | Login timestamp |
| `revokedAt` | Null if active; timestamp if revoked |
| `revokedReason` | `logout`, `password_change`, `admin_revoke`, `reuse_detected`, `idle`, etc. |

**Device fields returned by the API** (derived from `userAgent` via `ua-parser-js`, not duplicated in DB): `browser`, `os`, `deviceType`, optional `country`.

### 7.2 Session lifecycle

```
Login / OAuth / OTP success
  → create Session + RefreshToken
  → audit: auth.session_created
  → issue access JWT (includes sessionId)

Active use
  → refresh rotates refresh token
  → lastActiveAt updated
  → audit: auth.refresh

User / system revoke
  → Session.revokedAt set + refresh tokens revoked
  → audit: auth.session_revoked | auth.logout | auth.session_logout_all

Idle / cleanup job
  → idle sessions revoked (TOKEN_EXPIRATION.IDLE_SESSION_DAYS)
  → expired refresh tokens deleted
  → old revoked sessions hard-deleted
  → aged audit logs deleted (if retention > 0)
  → audit: auth.session_expired / auth.session_cleanup
```

### 7.3 Device lifecycle

1. **Detect** — On session create, parse UA → friendly `deviceName`, browser, OS, device type.
2. **Display** — Settings → Security → Active Sessions lists active rows; current session flagged via JWT `sessionId`.
3. **Rename** — `PATCH /auth/sessions/:id/rename` updates `deviceName` only (audit: `auth.session_renamed`).
4. **Revoke one** — `DELETE /auth/sessions/:id` revokes that device’s session + tokens. **Current session cannot be revoked this way** (use `POST /auth/logout`).
5. **Revoke others** — `DELETE /auth/sessions` revokes all *other* active sessions; keeps the caller’s current session.

### 7.4 Multiple Devices

- Configurable concurrent limit: `TOKEN_EXPIRATION.MAX_CONCURRENT_SESSIONS` (default 10).
- Each device gets its own session + refresh token chain.
- Exceeding the limit → oldest active session auto-revoked on new login.

### 7.5 Logout Current Device

```
POST /api/v1/auth/logout
→ Revoke session matching JWT sessionId
→ Clear refresh cookie
→ Clear access token from memory
→ Audit: auth.logout
```

### 7.6 Logout Other Devices

```
DELETE /api/v1/auth/sessions
→ Requires valid access token
→ Revoke all sessions for userId EXCEPT current sessionId
→ Invalidate those refresh tokens
→ Audit: auth.session_logout_all
```

Current device stays signed in. To end the current device, use `POST /auth/logout`.

### 7.7 Session List & Remote Revocation

```
GET    /api/v1/auth/sessions              → List active sessions (isCurrent flagged)
DELETE /api/v1/auth/sessions/:sessionId   → Revoke specific session (not current)
DELETE /api/v1/auth/sessions              → Revoke all other sessions
PATCH  /api/v1/auth/sessions/:sessionId/rename → Rename device
```

Users can remotely sign out a lost device from Settings without affecting the current session.

### 7.8 Cleanup strategy

Background job: `apps/api/src/jobs/session-cleanup.job.ts` (hourly after boot).

| Target | Rule |
|--------|------|
| Idle sessions | `lastActiveAt` older than `IDLE_SESSION_DAYS` (30) → revoke |
| Expired refresh tokens | `expiresAt < now` → delete |
| Revoked sessions | `revokedAt` older than `REVOKED_SESSION_RETENTION_DAYS` (30) → hard delete |
| Audit logs | Older than `AUDIT_LOG_RETENTION_DAYS` (90); `0` disables deletion |

### 7.9 Session security

- Reuse existing `Session` + `RefreshToken` tables — no parallel session stores.
- Access JWT embeds `sessionId`; revoked sessions fail on refresh / guarded routes.
- Current session cannot be accidentally deleted via `DELETE /sessions/:id`.
- Refresh-token reuse detection still revokes the entire session chain.
- All create / revoke / rename / cleanup events are audit-logged.
---

## 8. Security

### 8.1 Password Hashing

| Aspect | Decision |
|--------|----------|
| **Algorithm** | Argon2id (preferred) or bcrypt (cost factor 12) |
| **Salt** | Per-password random salt (handled by algorithm) |
| **Pepper** | Optional application-level secret (`PASSWORD_PEPPER` env) |
| **Never stored** | Plaintext passwords, password hints |
| **Never logged** | Passwords, hashes, reset tokens, OTP codes |

**Password policy:**

| Rule | Requirement |
|------|-------------|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Complexity | At least 1 uppercase, 1 lowercase, 1 digit, 1 special character |
| Common passwords | Block top 10,000 common passwords (dictionary check) |
| History | Prevent reuse of last 5 passwords (future) |

### 8.2 Rate Limiting

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /auth/login` | 10 requests | 15 min | IP + email |
| `POST /auth/signup` | 5 requests | 1 hour | IP |
| `POST /auth/forgot-password` | 3 requests | 1 hour | email |
| `POST /auth/reset-password` | 5 requests | 1 hour | IP |
| `POST /auth/verify-otp` | 5 requests | 10 min | otpSessionId |
| `POST /auth/resend-verification` | 3 requests | 1 hour | email |
| `POST /auth/refresh` | 30 requests | 15 min | sessionId |
| `POST /auth/oauth/callback` | 10 requests | 15 min | IP |
| Global API | 100 requests | 1 min | IP (authenticated: userId) |

**Implementation:** Redis-backed sliding window (production) or in-memory (development).

**Response:** `429 Too Many Requests` with `Retry-After` header.

### 8.3 CSRF Strategy

| Context | Strategy |
|---------|----------|
| **Refresh token cookie** | `SameSite=Strict` prevents cross-site cookie sending |
| **API mutations** | Access token in `Authorization` header (not cookie) — immune to CSRF |
| **OAuth callback** | State parameter validated against server-side store |
| **Future form endpoints** | CSRF token via double-submit cookie pattern if needed |

**Rationale:** The hybrid model (Bearer access token + HttpOnly refresh cookie) is CSRF-resistant because state-changing API calls require the access token in a header, which attackers cannot set cross-origin.

### 8.4 XSS Protection

| Control | Implementation |
|---------|---------------|
| Access token in memory | Not in localStorage/sessionStorage (XSS cannot persistently steal) |
| Refresh token HttpOnly | JavaScript cannot read the cookie |
| Content Security Policy | Strict CSP headers on web app |
| Input sanitization | React auto-escapes; DOMPurify for rich text (future) |
| No inline scripts | CSP `script-src 'self'` |
| Cookie flags | `HttpOnly`, `Secure`, `SameSite=Strict` |

### 8.5 SQL Injection Protection

| Control | Implementation |
|---------|---------------|
| ORM parameterized queries | Prisma — all queries parameterized by default |
| No raw SQL | Except migrations; raw queries require parameterized inputs |
| Input validation | Zod schemas on all endpoints before database access |
| Least privilege DB user | Application DB user has no DDL permissions |

### 8.6 Input Validation

| Layer | Tool | Scope |
|-------|------|-------|
| API request body | Zod (`auth.validation.ts`) | All auth endpoints |
| API query params | Zod | Token, pagination params |
| Shared schemas | `packages/shared/src/schemas/auth.schema.ts` | Frontend + backend |
| Frontend forms | React Hook Form + Zod resolver | Auth pages |
| Response validation | Zod (optional, recommended) | API response contracts |

### 8.7 Audit Logs

All authentication events are recorded per ADR-020.

| Action Code | Trigger |
|-------------|---------|
| `auth.signup` | New account created |
| `auth.login` | Successful login |
| `auth.failed_login` | Failed login attempt |
| `auth.logout` | User logout |
| `auth.logout_all` | Logout all devices |
| `auth.refresh` | Token refreshed (sampled, not every refresh) |
| `auth.token_reuse_detected` | Refresh token reuse |
| `auth.password_reset_requested` | Forgot password |
| `auth.password_reset_completed` | Password reset |
| `auth.password_changed` | Password changed in settings |
| `auth.email_verified` | Email verified |
| `auth.otp_sent` | OTP generated |
| `auth.otp_verified` | OTP validated |
| `auth.otp_failed` | OTP validation failed |
| `auth.oauth_login` | Social login |
| `auth.session_revoked` | Session remotely revoked |
| `auth.account_locked` | Too many failed logins |
| `auth.role_changed` | User role modified |

**Audit log fields:** `userId`, `action`, `resource`, `resourceId`, `metadata`, `ipAddress`, `userAgent`, `createdAt`.

**Rules:**
- Async write (non-blocking)
- Immutable (append-only)
- Never log passwords, tokens, or OTP codes
- Retention: 2 years default

---

## 9. Database Planning

> **Note:** Table definitions below are planning documentation only. No schema code is included. Prisma models will be created in `packages/database/prisma/schema/` during implementation.

### 9.1 Core Authentication Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **User** | Core user identity and credentials | → Role, → Sessions, → OAuthAccounts |
| **Role** | Role definitions (SUPER_ADMIN, ADMIN, EMPLOYEE, CLIENT) | ← Users, → RolePermissions |
| **Permission** | Atomic permission keys (`clients:read`, etc.) | ← RolePermissions |
| **RolePermission** | Many-to-many join between roles and permissions | → Role, → Permission |

### 9.2 Session & Token Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **Session** | Device session tracking | → User, → RefreshTokens |
| **RefreshToken** | Hashed refresh tokens with rotation chain | → Session, → User |
| **OAuthAccount** | Linked social provider accounts | → User |

### 9.3 Verification & Recovery Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **EmailVerificationToken** | Email confirmation tokens (hashed) | → User |
| **PasswordResetToken** | Password reset tokens (hashed, single-use) | → User |
| **OtpVerification** | OTP codes for 2FA and verification (hashed) | → User |

### 9.4 Security & Compliance Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **AuditLog** | Immutable security and mutation audit trail | → User |
| **LoginAttempt** | Failed login tracking for lockout | → User (nullable) |

### 9.5 Table Field Planning

#### User

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `email` | string (unique) | Login identifier |
| `passwordHash` | string (nullable) | Null for OAuth-only users |
| `firstName` | string | Display name |
| `lastName` | string | Display name |
| `avatarUrl` | string (nullable) | Profile image |
| `roleId` | FK → Role | Current role |
| `status` | enum | `PENDING_VERIFICATION`, `ACTIVE`, `LOCKED`, `DEACTIVATED` |
| `emailVerified` | boolean | Default false |
| `emailVerifiedAt` | datetime (nullable) | |
| `failedLoginAttempts` | int | Default 0 |
| `lockedUntil` | datetime (nullable) | Account lockout expiry |
| `lastLoginAt` | datetime (nullable) | |
| `companyId` | FK (nullable) | Tenant scoping (future multi-tenant) |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |
| `deletedAt` | datetime (nullable) | Soft delete |

#### Session

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key; included in JWT |
| `userId` | FK → User | |
| `deviceName` | string | Parsed user agent |
| `ipAddress` | string | |
| `userAgent` | string | |
| `lastActiveAt` | datetime | Updated on refresh |
| `revokedAt` | datetime (nullable) | |
| `revokedReason` | string (nullable) | |
| `createdAt` | datetime | |

#### RefreshToken

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `tokenHash` | string (unique) | SHA-256 hash of opaque token |
| `sessionId` | FK → Session | |
| `userId` | FK → User | |
| `expiresAt` | datetime | 7 days from issuance |
| `revokedAt` | datetime (nullable) | |
| `replacedByTokenId` | FK (nullable) | Rotation chain pointer |
| `createdAt` | datetime | |

#### Role

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `code` | string (unique) | `SUPER_ADMIN`, `ADMIN`, `EMPLOYEE`, `CLIENT` |
| `name` | string | Display name |
| `description` | string | |
| `isSystem` | boolean | Prevent deletion of built-in roles |
| `createdAt` | datetime | |

#### Permission

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `key` | string (unique) | `clients:read` |
| `resource` | string | `clients` |
| `action` | string | `read` |
| `description` | string | Human-readable |

#### RolePermission

| Field | Type | Notes |
|-------|------|-------|
| `roleId` | FK → Role | Composite PK |
| `permissionId` | FK → Permission | Composite PK |

#### OAuthAccount

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `userId` | FK → User | |
| `provider` | enum | `GOOGLE`, `GITHUB` |
| `providerAccountId` | string | Provider's user ID |
| `accessToken` | string (encrypted) | Provider token |
| `refreshToken` | string (encrypted, nullable) | |
| `expiresAt` | datetime (nullable) | |
| `createdAt` | datetime | |
| Unique constraint | | `(provider, providerAccountId)` |

#### EmailVerificationToken

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `userId` | FK → User | |
| `tokenHash` | string (unique) | SHA-256 hash |
| `expiresAt` | datetime | 24 hours |
| `usedAt` | datetime (nullable) | |
| `createdAt` | datetime | |

#### PasswordResetToken

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `userId` | FK → User | |
| `tokenHash` | string (unique) | SHA-256 hash |
| `expiresAt` | datetime | 1 hour |
| `usedAt` | datetime (nullable) | |
| `createdAt` | datetime | |

#### OtpVerification

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `userId` | FK → User | |
| `codeHash` | string | SHA-256 hash of 6-digit code |
| `purpose` | enum | `LOGIN_2FA`, `PASSWORD_RESET`, `SENSITIVE_ACTION` |
| `attempts` | int | Max 3 |
| `expiresAt` | datetime | 5–10 minutes |
| `usedAt` | datetime (nullable) | |
| `createdAt` | datetime | |

#### LoginAttempt

| Field | Type | Notes |
|-------|------|-------|
| `id` | CUID | Primary key |
| `email` | string | Attempted email |
| `userId` | FK (nullable) | If user found |
| `ipAddress` | string | |
| `userAgent` | string | |
| `success` | boolean | |
| `failureReason` | string (nullable) | |
| `createdAt` | datetime | |

### 9.6 Indexes (Planning)

| Table | Index | Purpose |
|-------|-------|---------|
| User | `email` (unique) | Login lookup |
| User | `roleId` | Role queries |
| User | `status` | Active user filtering |
| Session | `userId, revokedAt` | Active sessions list |
| RefreshToken | `tokenHash` (unique) | Token lookup |
| RefreshToken | `sessionId` | Session tokens |
| RefreshToken | `expiresAt` | Cleanup job |
| OAuthAccount | `provider, providerAccountId` (unique) | Provider lookup |
| AuditLog | `userId, createdAt` | User activity queries |
| AuditLog | `action, createdAt` | Security investigations |
| LoginAttempt | `email, createdAt` | Lockout tracking |

### 9.7 Seed Data (Planning)

| Seed File | Contents |
|-----------|----------|
| `roles.seed.ts` | 4 system roles |
| `permissions.seed.ts` | All permission keys |
| `role-permissions.seed.ts` | Role-permission matrix |
| `users.seed.ts` | Demo users (1 per role) for development |

---

## 10. API Planning

> **Base URL:** `/api/v1/auth`  
> **Note:** Endpoints are planned only. No implementation in this phase.

### 10.1 Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| `POST` | `/auth/signup` | No | Register new account |
| `POST` | `/auth/login` | No | Email/password login |
| `POST` | `/auth/logout` | Yes | Logout current device |
| `POST` | `/auth/logout-all` | Yes | Logout all devices |
| `POST` | `/auth/refresh` | Cookie | Refresh access token |
| `GET` | `/auth/me` | Yes | Get current user profile + role |

### 10.2 Password Management Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| `POST` | `/auth/forgot-password` | No | Request password reset email |
| `POST` | `/auth/reset-password` | No | Reset password with token |
| `POST` | `/auth/change-password` | Yes | Change password (requires current password) |

### 10.3 Verification Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| `POST` | `/auth/verify-email` | No | Verify email with token |
| `GET` | `/auth/verify-email` | No | Verify email (redirect flow) |
| `POST` | `/auth/resend-verification` | No | Resend verification email |
| `POST` | `/auth/verify-otp` | No | Verify OTP code |
| `POST` | `/auth/resend-otp` | No | Resend OTP code |

### 10.4 OAuth Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| `POST` | `/auth/oauth/callback` | No | Complete OAuth login (Supabase token exchange) |
| `POST` | `/auth/oauth/link` | Yes | Link OAuth provider to existing account |
| `DELETE` | `/auth/oauth/:provider` | Yes | Unlink OAuth provider |

### 10.5 Session Management Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| `GET` | `/auth/sessions` | Yes | List active device sessions |
| `DELETE` | `/auth/sessions` | Yes | Revoke all other sessions (keep current) |
| `DELETE` | `/auth/sessions/:sessionId` | Yes | Revoke specific session (not current) |
| `PATCH` | `/auth/sessions/:sessionId/rename` | Yes | Rename device display name |

### 10.6 Standard Response Format

**Success:**

```
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "ISO-8601" }
}
```

**Error:**

```
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": []
  },
  "meta": { "timestamp": "ISO-8601" }
}
```

### 10.7 Error Codes (Auth Module)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `AUTH_ACCOUNT_LOCKED` | 403 | Too many failed attempts |
| `AUTH_ACCOUNT_DEACTIVATED` | 403 | Account disabled |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token expired |
| `AUTH_TOKEN_INVALID` | 401 | Malformed or tampered token |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Invalid or revoked refresh token |
| `AUTH_REFRESH_TOKEN_REUSED` | 401 | Token reuse detected |
| `AUTH_OTP_INVALID` | 400 | Wrong OTP code |
| `AUTH_OTP_EXPIRED` | 400 | OTP expired |
| `AUTH_OTP_MAX_ATTEMPTS` | 429 | Too many OTP attempts |
| `AUTH_EMAIL_ALREADY_EXISTS` | 409 | Duplicate email on signup |
| `AUTH_RESET_TOKEN_INVALID` | 400 | Invalid reset token |
| `AUTH_RESET_TOKEN_EXPIRED` | 400 | Expired reset token |
| `AUTH_RATE_LIMITED` | 429 | Too many requests |
| `AUTH_FORBIDDEN` | 403 | Insufficient permissions |
| `AUTH_OAUTH_ACCOUNT_EXISTS` | 409 | OAuth email conflicts with existing account |

---

## 11. Frontend Planning

> **Note:** Pages are planned only. No implementation in this phase.  
> All pages live under `apps/web/src/app/(auth)/` using the existing auth layout.

### 11.1 Authentication Pages

| Route | Page Component | Purpose | Key Features |
|-------|---------------|---------|--------------|
| `/login` | `LoginPage` | User login | Email/password form, social login buttons, "Forgot password?" link, redirect if authenticated |
| `/signup` | `SignupPage` | User registration | Name, email, password, confirm password, terms checkbox, redirect to verify-email |
| `/forgot-password` | `ForgotPasswordPage` | Request reset | Email input, success message, back to login |
| `/reset-password` | `ResetPasswordPage` | Set new password | Token from URL query, new password + confirm, password strength indicator |
| `/verify-email` | `VerifyEmailPage` | Email confirmation | Auto-verify from URL token, resend button, success/error states |
| `/verify-otp` | `VerifyOtpPage` | OTP entry | 6-digit input, countdown timer, resend OTP, back to login |

### 11.2 Auth Feature Components (Planned)

| Component | Location | Purpose |
|-----------|----------|---------|
| `LoginForm` | `features/auth/components/` | Email/password form with React Hook Form + Zod |
| `SignupForm` | `features/auth/components/` | Registration form |
| `ForgotPasswordForm` | `features/auth/components/` | Email submission form |
| `ResetPasswordForm` | `features/auth/components/` | New password form |
| `OtpInput` | `features/auth/components/` | 6-digit OTP input with auto-focus |
| `SocialLoginButtons` | `features/auth/components/` | Google + GitHub OAuth buttons |
| `AuthCard` | `features/auth/components/` | Shared auth page card wrapper (glassmorphism) |
| `PasswordStrengthIndicator` | `features/auth/components/` | Visual password strength meter |
| `AuthGuard` | `features/auth/components/` | Client-side route protection wrapper |

### 11.3 Auth Feature Services & State (Planned)

| File | Purpose |
|------|---------|
| `features/auth/services/auth.service.ts` | API calls for all auth endpoints |
| `features/auth/stores/auth.store.ts` | Zustand store: user, accessToken, isAuthenticated |
| `features/auth/hooks/use-auth.ts` | Auth state hook |
| `features/auth/hooks/use-auth-session.ts` | Session management hook |
| `features/auth/hooks/use-permissions.ts` | Permission check hook |
| `features/auth/types/auth.types.ts` | TypeScript interfaces |
| `features/auth/constants/auth.constants.ts` | Token keys, redirect paths |
| `components/providers/auth-provider.tsx` | React context provider |

### 11.4 Middleware & Route Protection (Planned)

| File | Purpose |
|------|---------|
| `middleware.ts` | Protect `(dashboard)`, `(admin)`, `(portal)` routes; redirect to `/login` |
| `lib/auth.ts` | Server-side auth helpers for Server Components |

**Protected route groups:**

| Route Group | Allowed Roles |
|-------------|--------------|
| `(dashboard)/*` | `ADMIN`, `EMPLOYEE` |
| `(admin)/*` | `SUPER_ADMIN` |
| `(portal)/*` | `CLIENT` |
| `(auth)/*` | Public (redirect if already authenticated) |

### 11.5 Settings Pages (Auth-Related, Phase 3 Scope)

| Route | Purpose |
|-------|---------|
| `/settings/security` | Change password, active sessions, logout all |
| `/settings/profile` | Update name, avatar (uses auth context) |

### 11.6 Shared Validation Schemas (Planned)

| Schema | Location | Used By |
|--------|----------|---------|
| `loginSchema` | `packages/shared/src/schemas/auth.schema.ts` | Login form + API |
| `signupSchema` | `packages/shared/src/schemas/auth.schema.ts` | Signup form + API |
| `forgotPasswordSchema` | `packages/shared/src/schemas/auth.schema.ts` | Forgot password form + API |
| `resetPasswordSchema` | `packages/shared/src/schemas/auth.schema.ts` | Reset password form + API |
| `changePasswordSchema` | `packages/shared/src/schemas/auth.schema.ts` | Settings form + API |
| `verifyOtpSchema` | `packages/shared/src/schemas/auth.schema.ts` | OTP form + API |

---

## 12. Backend Module Structure

### 12.1 API Module Layout

```
apps/api/src/
│
├── modules/
│   └── auth/
│       ├── auth.controller.ts          # HTTP handlers (thin — delegate to service)
│       ├── auth.service.ts             # Business logic (login, signup, token issuance)
│       ├── auth.repository.ts          # Prisma queries (users, sessions, tokens)
│       ├── auth.routes.ts              # Express route definitions
│       ├── auth.validation.ts          # Zod request schemas (re-export from shared)
│       ├── auth.types.ts               # Module-specific types
│       ├── auth.constants.ts           # Token expiry, lockout thresholds
│       └── index.ts                    # Barrel export
│
├── middleware/
│   ├── auth.middleware.ts              # JWT verification → attach user to request
│   ├── role.middleware.ts              # requireRole('ADMIN', 'SUPER_ADMIN')
│   ├── permission.middleware.ts        # requirePermission('clients:write')
│   ├── rate-limit.middleware.ts        # Per-route rate limiting
│   ├── validate.middleware.ts          # Zod request validation
│   ├── logger.middleware.ts            # Request logging
│   └── error.middleware.ts             # Global error handler
│
├── shared/
│   └── utils/
│       ├── token.ts                    # JWT sign/verify, refresh token generate/hash
│       ├── password.ts                 # Argon2id hash/verify
│       ├── otp.ts                      # OTP generate/hash/verify
│       └── logger.ts                   # Structured application logger
│
├── integrations/
│   ├── supabase/
│   │   ├── supabase.client.ts          # Service role client
│   │   └── supabase.auth.ts            # OAuth token verification
│   └── email/
│       └── email.service.ts            # Verification, reset, OTP emails
│
├── modules/
│   └── audit-log/
│       ├── audit-log.service.ts        # Write audit entries (used by auth)
│       ├── audit-log.repository.ts
│       └── audit-log.types.ts
│
└── config/
    ├── auth.config.ts                  # JWT expiry, cookie options, lockout settings
    └── rate-limit.config.ts            # Rate limit rules per endpoint
```

### 12.2 Shared Package Layout

```
packages/shared/src/
│
├── schemas/
│   └── auth.schema.ts                  # Zod schemas (login, signup, reset, etc.)
│
├── constants/
│   ├── roles.ts                        # Role enum (SUPER_ADMIN, ADMIN, etc.)
│   ├── permissions.ts                    # Permission key constants
│   └── auth-errors.ts                  # Error code constants
│
├── types/
│   └── auth.types.ts                   # User, Session, Token payload interfaces
│
└── index.ts                            # Barrel export
```

### 12.3 Database Package Layout

```
packages/database/
│
├── prisma/
│   ├── schema.prisma                   # Entry point (imports domain schemas)
│   ├── enums.prisma                    # UserStatus, OAuthProvider, OtpPurpose
│   └── schema/
│       ├── user.prisma                 # User, Role, Permission, RolePermission
│       ├── auth.prisma                 # Session, RefreshToken, OAuthAccount
│       ├── verification.prisma         # EmailVerification, PasswordReset, Otp
│       └── audit.prisma                # AuditLog, LoginAttempt
│
└── seed/
    ├── roles.seed.ts
    ├── permissions.seed.ts
    ├── role-permissions.seed.ts
    └── users.seed.ts
```

### 12.4 Frontend Feature Layout

```
apps/web/src/
│
├── features/auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   ├── reset-password-form.tsx
│   │   ├── otp-input.tsx
│   │   ├── social-login-buttons.tsx
│   │   ├── auth-card.tsx
│   │   ├── password-strength-indicator.tsx
│   │   └── auth-guard.tsx
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-auth-session.ts
│   │   └── use-permissions.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── stores/
│   │   └── auth.store.ts
│   ├── types/
│   │   └── auth.types.ts
│   ├── constants/
│   │   └── auth.constants.ts
│   └── index.ts
│
├── components/providers/
│   └── auth-provider.tsx
│
├── services/api/
│   ├── api-client.ts                   # Axios/fetch with auth interceptor
│   └── auth-interceptor.ts             # Attach token, handle 401 → refresh
│
├── middleware.ts                        # Route protection
└── lib/
    └── auth.ts                          # Server-side auth helpers
```

### 12.5 Module Dependency Rules

```
Controller → Service → Repository → Prisma
     ↓           ↓
 Validation   AuditLog Service
     ↓           ↓
 packages/shared (schemas, types, constants)

❌ Controller → Repository (skip service)
❌ Repository → Service (circular)
❌ auth.service → features/clients (cross-module in Phase 3)
✅ auth.service → audit-log.service
✅ auth.service → email.service
✅ auth.service → supabase.auth
```

---

## 13. Best Practices

### 13.1 Authentication

1. **Never trust the frontend** — All authorization decisions happen on the API.
2. **Fail closed** — Missing auth = 401. Missing permission = 403. No silent degradation.
3. **Generic error messages** — "Invalid email or password" (never reveal which field failed).
4. **Constant-time comparisons** — Password and token verification must not leak timing information.
5. **Invalidate on credential change** — Password change/reset revokes all sessions.
6. **Separate signup from role assignment** — Self-signup gets CLIENT; elevated roles require admin invite.

### 13.2 Token Management

7. **Access token in memory only** — Never localStorage or sessionStorage.
8. **Refresh token rotation** — Every refresh issues a new token and revokes the old one.
9. **Reuse detection** — Presenting a revoked refresh token revokes the entire session family.
10. **Short access token lifetime** — 15 minutes balances security and UX.
11. **Include sessionId in JWT** — Enables per-device logout and session tracking.

### 13.3 Development & Testing

12. **Shared Zod schemas** — Single source of truth in `packages/shared` for frontend and backend.
13. **Seed data for all roles** — Development environment has one user per role.
14. **Test matrix** — Every auth endpoint tested with valid, invalid, expired, and unauthorized inputs.
15. **Test role boundaries** — Verify Client cannot access Admin endpoints.
16. **Environment validation** — Zod-validated env at startup (`packages/config`).

### 13.4 Code Organization

17. **Thin controllers** — HTTP handling only; business logic in services.
18. **Repository pattern** — All Prisma queries in repository files.
19. **Feature-based modules** — Auth is self-contained under `modules/auth/`.
20. **Barrel exports** — Import from `features/auth/index.ts`, not deep paths.

### 13.5 Operations

21. **Token cleanup job** — Cron job deletes expired refresh tokens and verification tokens.
22. **Audit log retention** — Archive logs older than 2 years.
23. **Secret rotation** — `JWT_SECRET` rotated quarterly with graceful overlap period.
24. **Monitoring alerts** — Alert on spike in `auth.failed_login` or `auth.token_reuse_detected`.

---

## 14. Enterprise Security Rules

These rules are **mandatory** for all authentication implementation. Violations block merge.

### 14.1 Credential Security

| Rule | Requirement |
|------|-------------|
| **SEC-001** | Passwords hashed with Argon2id (or bcrypt cost ≥ 12). Never stored plaintext. |
| **SEC-002** | Passwords, tokens, and OTP codes never appear in logs, error messages, or audit metadata. |
| **SEC-003** | Password minimum 8 characters with complexity requirements enforced server-side. |
| **SEC-004** | Account locked after 5 consecutive failed logins for 15 minutes. |
| **SEC-005** | Password change requires current password verification. |

### 14.2 Token Security

| Rule | Requirement |
|------|-------------|
| **SEC-010** | Access tokens expire in ≤ 15 minutes. |
| **SEC-011** | Refresh tokens stored hashed in database; never logged or exposed in API responses. |
| **SEC-012** | Refresh tokens transmitted only via HttpOnly, Secure, SameSite=Strict cookies. |
| **SEC-013** | Refresh token rotation on every use; reuse triggers full session revocation. |
| **SEC-014** | JWT signed with server secret; `iss` and `aud` claims validated on verify. |
| **SEC-015** | Access tokens never stored in localStorage, sessionStorage, or non-HttpOnly cookies. |

### 14.3 API Security

| Rule | Requirement |
|------|-------------|
| **SEC-020** | All auth endpoints rate-limited per §8.2. |
| **SEC-021** | All request bodies validated with Zod before processing. |
| **SEC-022** | RBAC enforced on every protected endpoint via middleware. |
| **SEC-023** | CORS restricted to known frontend origins only. |
| **SEC-024** | HTTPS enforced in production; HTTP redirects to HTTPS. |
| **SEC-025** | API returns generic messages for auth failures (no user enumeration). |

### 14.4 Session Security

| Rule | Requirement |
|------|-------------|
| **SEC-030** | Users can view and revoke active sessions. |
| **SEC-031** | Password reset revokes all existing sessions. |
| **SEC-032** | Maximum 10 concurrent sessions per user (configurable). |
| **SEC-033** | Session records include IP and user agent for forensics. |
| **SEC-034** | Idle sessions expire after 30 days of inactivity. |

### 14.5 Audit & Compliance

| Rule | Requirement |
|------|-------------|
| **SEC-040** | All auth events logged to AuditLog table (ADR-020). |
| **SEC-041** | Audit logs are immutable (append-only, no UPDATE/DELETE). |
| **SEC-042** | Failed login attempts logged with IP and timestamp. |
| **SEC-043** | Role changes require `users:manage` permission and are audited. |
| **SEC-044** | Token reuse detection triggers audit alert and session revocation. |

### 14.6 Frontend Security

| Rule | Requirement |
|------|-------------|
| **SEC-050** | Content Security Policy headers configured on web app. |
| **SEC-051** | No secrets in `NEXT_PUBLIC_*` environment variables. |
| **SEC-052** | Auth state cleared on logout (memory, not just redirect). |
| **SEC-053** | Protected routes guarded by Next.js Middleware AND client-side auth check. |
| **SEC-054** | OAuth state parameter validated to prevent CSRF. |

### 14.7 Data Protection

| Rule | Requirement |
|------|-------------|
| **SEC-060** | All database queries via Prisma (parameterized). No raw SQL in auth module. |
| **SEC-061** | User soft delete (`deletedAt`); hard delete only via admin with audit. |
| **SEC-062** | PII (email, name) not logged in application logs; only in audit metadata where needed. |
| **SEC-063** | Email verification required before dashboard access. |
| **SEC-064** | OAuth provider tokens encrypted at rest in `OAuthAccount` table. |

---

## 15. Related Documents

| Document | Location | Relevance |
|----------|----------|-----------|
| Project Master Plan | `PROJECT_PLAN.md` | Phase 3 scope |
| Enterprise Architecture | `ENTERPRISE_ARCHITECTURE.md` | Monorepo structure, folder layout |
| ADR-009: PostgreSQL + Supabase | `docs/adr/ADR-009-postgresql-supabase.md` | Database platform |
| ADR-014: JWT + Refresh Tokens | `docs/adr/ADR-014-jwt-refresh-tokens.md` | Token strategy |
| ADR-015: RBAC | `docs/adr/ADR-015-role-based-access-control.md` | Authorization model |
| ADR-020: Audit Logs | `docs/adr/ADR-020-logging-audit-logs.md` | Audit requirements |
| ADR-013: Zod Validation | `docs/adr/ADR-013-zod-validation.md` | Input validation |
| Design System | `docs/design-system/DESIGN_SYSTEM.md` | Auth page visual design |
| UI Audit (Phase 2) | `docs/ui-audit-phase-2.md` | Dashboard UI freeze status |
| Git Workflow | `docs/git-workflow.md` | Branching for Phase 3 |
| Session & Device Management | `docs/architecture/session-device-management.md` | Step 10 sessions/devices/cleanup |
| RBAC Permission Engine | `docs/architecture/rbac-permission-engine.md` | Roles & permissions |
| Authentication Completion Report | `docs/architecture/authentication-completion-report.md` | Step 11 QA scores & readiness |
| Security Checklist | `docs/architecture/authentication-security-checklist.md` | Pre-production security gates |

---

## Implementation Sequence (Recommended)

When implementation begins, follow this order:

| Step | Deliverable | Dependencies |
|------|-------------|-------------|
| 1 | Database schema + seeds (roles, permissions, demo users) | — |
| 2 | Shared Zod schemas + types (`packages/shared`) | Step 1 |
| 3 | Token utilities + password hashing (`apps/api`) | Step 2 |
| 4 | Auth module: signup, login, logout, refresh | Steps 1–3 |
| 5 | Auth middleware + RBAC middleware | Step 4 |
| 6 | Email verification + forgot/reset password | Step 4 |
| 7 | OTP verification | Step 4 |
| 8 | Session management endpoints | Step 4 |
| 9 | OAuth integration (Google, GitHub) | Step 4, Supabase |
| 10 | Frontend auth pages + forms | Steps 2, 4 |
| 11 | Auth provider + Zustand store + API interceptor | Step 10 |
| 12 | Next.js Middleware route protection | Steps 5, 11 |
| 13 | Settings: security page (sessions, change password) | Steps 8, 11 |
| 14 | Audit log integration for all auth events | Step 4 |
| 15 | Rate limiting + security hardening | Step 4 |
| 16 | E2E tests for all auth flows | Steps 1–15 |

---

*This document is the authoritative architecture blueprint for Phase 3 Authentication. No code, API endpoints, or UI pages have been implemented. Implementation requires explicit approval to proceed.*
