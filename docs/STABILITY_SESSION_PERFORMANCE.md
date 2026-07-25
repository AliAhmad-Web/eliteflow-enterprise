# Stability + Performance + Session Persistence

## 1. Root cause analysis

### Logout on browser refresh
1. **Refresh-token rotation races** — Every `/auth/refresh` rotated the HttpOnly cookie. Parallel callers (Strict Mode, duplicated Next chunks, multi-tab, bootstrap + API) presented the *old* cookie after rotation. Server treated that as theft and **revoked the entire session**.
2. **`clearAuthState()` reset the bootstrap mutex mid-flight** — Allowed a second bootstrap/refresh while the first was still running, amplifying the race.
3. **Immediate session wipe on any rotated-token reuse** — No durable grace for normal concurrent refresh.

### Slow startup / navigation
1. Secondary data waited on idle; Communication shared the idle queue with CRM.
2. React Query cache died on F5 (no persistence).
3. Communication cold paths used full `LoadingState` spinners when cache was empty.
4. Lazy feature wrappers used 40vh spinners (conflicted with keep-alive `fallback={null}`).

---

## 2. Files changed

### Auth / session
- `apps/api/src/modules/auth/auth.service.ts` — Skip rotation for young tokens (&lt;15m); never wipe session for rotated-token reuse; access-token-only on race loss
- `apps/api/src/modules/auth/auth.repository.ts` — Atomic rotate (`updateMany` where `revokedAt: null`)
- `apps/api/src/modules/auth/auth.cookies.ts` — `sameSite: "lax"`
- `apps/api/src/modules/auth/auth.controller.ts` — Only set cookie when a new refresh token is returned
- `apps/web/src/services/api/api-client.ts` — Global refresh mutex; no bootstrap reset on clear; one retry on 401; never clear on network errors
- `apps/web/src/features/auth/utils/session-bootstrap.ts` — Safer restore; getMe retry
- `apps/web/src/features/auth/utils/session-bootstrap-mutex.ts` — Shared mutex (no circular imports)
- `apps/web/src/features/auth/utils/auth-session-cache.ts` — localStorage profile restore
- `apps/web/src/features/auth/components/auth-guard.tsx` — Shell while restoring
- `apps/web/src/features/auth/components/auth-provider.tsx` — Silent refresh waits for initialized
- `apps/web/src/features/auth/hooks/use-logout.ts` — Clear RQ + persisted cache

### Cache / nav / UX
- `apps/web/src/services/api/query-client.ts` — Global `keepPreviousData` + localStorage query persistence
- `apps/web/src/components/layout/dashboard-route-warmup.tsx` — Immediate Settings+Communication prefetch; idle warm for CRM/invoices/calendar/reports/team/notifications/integrations/files
- `apps/web/src/components/layout/keep-alive-outlet.tsx` — Persist scroll to sessionStorage
- `apps/web/src/components/common/loading/lazy-feature-pages.tsx` — `loading: () => null`
- `apps/web/src/components/common/feedback/soft-content-skeleton.tsx` — Soft placeholders
- Communication page contents — Soft skeletons instead of full spinners
- Settings hooks/pages — Prefetch, cache, memo, tab persistence (prior + continued)

---

## 3. Architecture improvements

| Layer | Before | After |
|---|---|---|
| Refresh tokens | Rotate every refresh | Rotate only if token age ≥ 15m; atomic claim |
| Concurrent refresh | Session revoked | Access token only; cookie from winning request |
| Client mutex | Module-local (chunk-duplicable) | `globalThis` |
| Query cache | Memory only | localStorage dehydrate for list/overview keys |
| Warmup | Mostly idle | Settings + Communication immediate |
| Keep-alive scroll | Memory Map | sessionStorage |

---

## 4. Performance improvements

- Shell (sidebar/header) paints before auth finish when hint/cache exists
- F5 restores React Query lists/overviews from localStorage → background refetch
- Prefetch after login covers Settings, Communication hub, CRM, invoices, calendar, reports, team, notifications, integrations, files
- No blocking route `loading.tsx`; soft skeletons only when no cache
- Keep-alive preserves page state across soft nav

---

## 5. Authentication improvements

- HttpOnly refresh cookie retained (`path=/api/v1/auth`, `sameSite=lax`)
- Silent restore: layoutEffect cached user → bootstrap refresh → getMe
- Never redirect to login until bootstrap finishes **and** session is invalid
- Transient network failures do not clear session
- Logout clears store, hint, RQ memory, and persisted RQ cache

---

## 6. Before vs after

| Scenario | Before | After |
|---|---|---|
| F5 on /dashboard | Often logged out | Stay logged in |
| Hard refresh | Session kill on race | Stable |
| Open /settings after login | Slow / spinner | Instant from prefetch/cache |
| Messages/Channels | Full spinner first visit | Prefetched + soft skeleton only if empty |
| Soft nav | Occasional remount/flash | Keep-alive + optimistic path |
| F5 with warm RQ | Blank then fetch | Hydrated then background refresh |

---

## 7. Testing checklist

- [ ] Login → land on dashboard (shell instant)
- [ ] F5 → remain logged in, same URL
- [ ] Ctrl+Shift+R → remain logged in
- [ ] Close browser, reopen app URL → still logged in (within cookie lifetime)
- [ ] Open second tab → both authenticated
- [ ] Open Settings → instant; switch tabs; leave & return → tab preserved
- [ ] Open Messages / Channels / Meetings / Activity → no full-page spinner when warm
- [ ] Soft-nav Clients → Projects → Tasks → back → filters/scroll preserved where keep-alive applies
- [ ] Wait 20+ minutes → silent refresh keeps session
- [ ] Logout → login page; F5 on login stays logged out
- [ ] Invalid/expired refresh → redirect to login once (no flicker loop)
