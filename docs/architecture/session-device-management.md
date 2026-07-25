# Session & Device Management

**Phase:** 3 — Step 10  
**Related:** [Authentication Architecture](./authentication-architecture.md)

## Overview

Enterprise session management reuses the existing `Session` and `RefreshToken` tables. Device metadata is derived from `userAgent` at read time; friendly names are stored and user-editable.

## Folder structure

```
apps/api/src/
  jobs/session-cleanup.job.ts
  modules/auth/
    auth.device.ts          # UA → browser/OS/deviceType/name
    auth.service.ts         # getActiveSessions, revoke*, rename*, cleanup*
    auth.repository.ts      # list/rename/revoke/cleanup queries
    auth.controller.ts
    auth.routes.ts

apps/web/src/
  app/(dashboard)/settings/
    page.tsx
    security/page.tsx
    security/sessions/page.tsx
  features/auth/
    components/active-sessions-panel.tsx
    components/session-card.tsx
    hooks/use-sessions.ts
    hooks/use-revoke-session.ts
    hooks/use-revoke-other-sessions.ts
    hooks/use-rename-session.ts
    services/auth.service.ts   # list/revoke/rename API calls
```

## API endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/v1/auth/sessions` | List active sessions; `isCurrent` from JWT |
| `DELETE` | `/api/v1/auth/sessions/:id` | Revoke one device (blocks current) |
| `DELETE` | `/api/v1/auth/sessions` | Revoke all **other** devices |
| `PATCH` | `/api/v1/auth/sessions/:id/rename` | Update `deviceName` |
| `POST` | `/api/v1/auth/logout` | End **current** session (existing) |

## Service methods

- `getActiveSessions(userId, currentSessionId)`
- `isCurrentSession(sessionId, currentSessionId)`
- `revokeSession(...)` — refuses current unless `allowCurrent`
- `revokeAllSessions(...)` — others only
- `renameSession(...)`
- `cleanupExpiredSessions()` — idle sessions, expired tokens, old revoked rows, audit retention

## Cleanup job

Started from `apps/api/src/server.ts` via `startSessionCleanupJob()` (hourly). Retention constants live in `@enterprise/shared` `TOKEN_EXPIRATION`.

## Frontend

Navigate: **Settings → Security → Active Sessions** (`/settings/security/sessions`).

Hooks: `useSessions`, `useRevokeSession`, `useRevokeOtherSessions`, `useRenameSession`.

## Audit actions

| Action | When |
|--------|------|
| `auth.session_created` | Login / OAuth / OTP session create |
| `auth.session_revoked` | Remote device logout |
| `auth.logout` | Current device logout |
| `auth.session_logout_all` | Logout other devices |
| `auth.session_renamed` | Device rename |
| `auth.session_expired` | Idle cleanup revoked sessions |
| `auth.session_cleanup` | Cleanup job summary |

## Testing guide

1. Sign in as `employee@eliteflow.dev` / `Password123!`.
2. Open `/settings/security/sessions` — confirm current session badge.
3. Sign in from a second browser/profile → refresh list → two sessions.
4. Rename the other device → verify name updates.
5. Log out the other device → only current remains.
6. Create another session → **Log out all other devices** → only current remains.
7. Attempt `DELETE /sessions/:currentId` with current session JWT → expect 400.
8. Confirm API server logs `[cleanup]` after ~15s on boot / hourly thereafter.
