# ADR-014: Why JWT + Refresh Tokens

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application requires authentication for four user roles (Super Admin, Admin, Employee, Client) across a separated frontend (Next.js on Vercel) and backend (Express API). Users authenticate via email/password, OTP verification, and social login (Google, GitHub). Sessions must be secure, stateless on the server, and support token refresh without re-login.

The application handles sensitive business data — client records, financial invoices, team information — requiring robust authentication with minimal attack surface.

---

## Problem

We need an authentication mechanism that can:

- Authenticate users across a separated frontend and backend (different domains)
- Support stateless API authentication — backend should not store session data in memory or database for every request
- Issue short-lived access tokens to minimize exposure if compromised
- Issue long-lived refresh tokens for seamless user experience (no frequent re-login)
- Support role and permission claims embedded in tokens for RBAC (ADR-015)
- Work with Next.js Middleware for route protection
- Integrate with social login providers (Google, GitHub) via Supabase Auth
- Support token revocation (logout, password change, account deactivation)
- Scale horizontally — multiple API server instances without shared session store

Session-based auth (cookies + server-side sessions) requires sticky sessions or a shared session store (Redis), adding infrastructure complexity. API keys lack user context and expiration.

---

## Decision

We will implement **JWT (JSON Web Token) authentication with Refresh Token rotation**.

### Token strategy:

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| **Access Token** | 15 minutes | Memory (frontend) | API request authorization |
| **Refresh Token** | 7 days | HttpOnly cookie | Obtain new access tokens |

### Authentication flow:

1. User logs in (email/password, OTP, or social) → backend validates credentials
2. Backend issues **access token** (JWT, 15 min) + **refresh token** (opaque, 7 days)
3. Access token sent in `Authorization: Bearer <token>` header on every API request
4. Refresh token stored in **HttpOnly, Secure, SameSite=Strict** cookie
5. When access token expires → frontend calls `/api/v1/auth/refresh` with cookie
6. Backend validates refresh token → issues new access token + rotates refresh token
7. On logout → refresh token invalidated in database, cookie cleared

### JWT payload:

```typescript
{
  sub: "user-id",
  email: "user@example.com",
  role: "ADMIN",
  permissions: ["clients:read", "clients:write", "projects:read"],
  iat: 1234567890,
  exp: 1234568790
}
```

### Key implementation:

- **Access token** signed with `JWT_SECRET` — verified by `auth.middleware.ts`
- **Refresh token** stored in PostgreSQL `RefreshToken` table — enables revocation
- **Token rotation** — each refresh invalidates the old refresh token and issues a new one
- **Next.js Middleware** — reads access token, validates, redirects unauthenticated users
- **Supabase Auth** — handles social login OAuth flow; our backend issues JWT after Supabase verification

---

## Consequences

### Positive

- **Stateless API** — no server-side session store; any API instance can verify tokens
- **Horizontal scaling** — add API servers without session affinity or Redis
- **Short-lived access tokens** — 15-minute window limits damage from token theft
- **Refresh token rotation** — stolen refresh tokens detected when legitimate user refreshes
- **Role/permission claims** — RBAC enforced without database lookup on every request
- **Cross-domain** — works with frontend on Vercel and API on separate domain
- **Revocation support** — refresh tokens stored in DB; logout/password change invalidates them

### Negative

- **Token size** — JWT payload adds ~200–500 bytes per request header
- **Cannot revoke access tokens** — valid until expiry (mitigated by 15-minute lifetime)
- **Refresh token storage** — requires database table and cleanup job for expired tokens
- **Complexity** — token refresh logic, rotation, and cookie management add implementation effort
- **Clock skew** — JWT expiry depends on server clock synchronization

### Neutral

- HttpOnly cookies for refresh tokens prevent XSS access; access tokens in memory prevent CSRF
- Supabase Auth handles OAuth complexity; our JWT layer handles API authorization

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Session-based auth (cookies)** | Requires shared session store (Redis) for horizontal scaling; sticky sessions limit deployment |
| **API keys** | No user context, no expiration, no role claims; unsuitable for user authentication |
| **OAuth 2.0 only (no JWT)** | Still need a token format for API authorization; JWT is the standard bearer token |
| **Paseto** | Less ecosystem support; fewer libraries; team unfamiliarity |
| **Long-lived JWT only (no refresh)** | Security risk; stolen tokens valid for days/weeks; no revocation |
| **Supabase Auth tokens directly** | Couples API authorization to Supabase; less control over claims and expiry |

---

## Why This Decision Is Best

JWT + Refresh Tokens is the industry standard for separated frontend/backend architectures. For our setup — Next.js on Vercel, Express API on a separate host, four user roles with permissions — this pattern provides the optimal balance of security, scalability, and user experience.

Short-lived access tokens (15 minutes) limit the blast radius of token theft. Refresh token rotation with database-backed revocation gives us logout and account deactivation capabilities. Embedding role and permission claims in the JWT eliminates a database query on every API request — critical for performance at scale.

The approach integrates cleanly with our stack: Express middleware verifies JWTs, Next.js Middleware protects routes, and Supabase Auth handles the OAuth complexity for social login. Each layer does one job.
