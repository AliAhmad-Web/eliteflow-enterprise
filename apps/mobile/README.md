# EliteFlow Mobile

React Native / Expo client for the **existing** Enterprise Business Management platform.

**Status:** M1–M4 complete (v1.0.0). Production & release docs: `docs/M4_COMPLETE.md`.

This app is another client of `apps/api`. It does **not** duplicate backend logic, APIs, or database schema. Web (`apps/web`) is untouched.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo SDK 57 + React Native + TypeScript |
| Navigation | Expo Router (tabs + drawer) |
| State | Zustand (auth, theme) |
| Server state | TanStack Query |
| Auth | Same JWT + refresh flow as web (`/api/v1/auth`) |
| Shared types | `@enterprise/shared` |
| Themes | Light / Dark / Emerald / Sapphire (mirrored from web tokens) |

## Folder structure

```
apps/mobile/
  app/                      # Expo Router screens
    (auth)/                 # Login, forgot password
    (app)/
      (tabs)/               # Dashboard, Search, Notifications, Profile
      settings.tsx
      ai-assistant.tsx
      projects|tasks|calendar.tsx   # M2 placeholders
  src/
    api/                    # API client + services (consumes existing /api/v1)
    auth/                   # Secure storage, Zustand session, bootstrap
    theme/                  # Four-theme token engine
    components/             # UI, dashboard, navigation, placeholders
    providers/              # Query + auth gate + splash
  metro.config.js           # Monorepo watchFolders for @enterprise/shared
```

## Run locally

1. Start the existing API: `npm run api:dev` (port 4000)
2. Copy env: `cp apps/mobile/.env.example apps/mobile/.env`
   - Physical device: set `EXPO_PUBLIC_API_URL` to your machine LAN IP (e.g. `http://192.168.1.10:4000`)
3. Start Expo: `npm run mobile:start`

## Authentication strategy

| Concern | Approach |
|---------|----------|
| Access JWT | Memory (Zustand) + SecureStore |
| Refresh token | Captured from `Set-Cookie` on login / refresh, stored in SecureStore, re-sent as `Cookie` header on auth routes |
| Session restore | Cold start → hydrate SecureStore → refresh → `GET /auth/me` |
| RBAC | `hasPermission` / `PERMISSIONS` from `@enterprise/shared` |
| CSRF | Skipped automatically for pure Bearer clients (no CSRF cookie) |

No backend changes. Production refresh relies on attaching the stored refresh token as a Cookie header (Express `cookie-parser` reads it the same as a browser jar). Body `{ refreshToken }` remains a non-production fallback already supported by the API.

## Theme system

Tokens in `src/theme/tokens.ts` mirror `apps/web/src/app/globals.css` for:

- `light` — purple brand
- `dark` — near-black + violet (default)
- `emerald`
- `sapphire`

Persisted via AsyncStorage (`eliteflow-mobile-theme`).

## Dashboard (mobile-first)

Live data from existing endpoints (not web dummy files):

- `GET /api/v1/reports/analytics` — revenue KPIs
- `GET /api/v1/projects/stats`
- `GET /api/v1/tasks/stats`
- `GET /api/v1/calendar/upcoming`
- `GET /api/v1/notifications/unread-count`

Plus quick actions, AI entry card, and calendar preview — laid out for a phone viewport (2-column KPIs, action grid), not a desktop clone.

## M1 feature checklist

1. Splash / session gate  
2. Secure token storage  
3. Login (+ OTP step)  
4. Forgot password  
5. Session restore  
6. Bottom tabs  
7. Drawer navigation  
8. Dashboard  
9. Profile  
10. Settings  
11. Theme switcher  
12. Notifications  
13. Global search  
14. Loading states  
15. Error states  
16. Empty states  

## Rules honored

- Did not modify `apps/web`, `apps/api`, database, or shared business logic beyond consuming `@enterprise/shared` types
- Did not create duplicate APIs

## Next

M3 is complete — see [docs/M3_COMPLETE.md](./docs/M3_COMPLETE.md).  
M4 plan: [docs/M4_IMPLEMENTATION_PLAN.md](./docs/M4_IMPLEMENTATION_PLAN.md).

**Await approval before starting M4.**
