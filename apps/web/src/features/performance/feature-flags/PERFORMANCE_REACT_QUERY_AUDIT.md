# React Query Audit (Task 1.4 Phase 1)

Source of truth: `apps/web/src/services/api/query-client.ts`.

## Global defaults (current — leave unchanged in Phase 1)

| Option | Value | Rationale |
|--------|-------|-----------|
| `staleTime` | 5 minutes | Reduces duplicate GETs on soft nav |
| `gcTime` | 60 minutes | Aligns with keep-alive dwell |
| `retry` | 1 (queries) / 0 (mutations) | Fail fast for UX |
| `refetchOnWindowFocus` | false | Avoid surprise refetches |
| `refetchOnMount` | false | Soft nav uses cache (RC#6) |
| `refetchOnReconnect` | true | Recover after offline |
| `placeholderData` | `keepPreviousData` | Smooth pagination/filter |
| `structuralSharing` | true | Fewer re-renders on equal data |
| Persist | localStorage allowlist, 24h | Faster F5 for list shells |

**AI query keys** (`ai`) are **not** in the persist allowlist — intentional (chat freshness).

## Feature-level overrides

| Feature | Pattern | Notes |
|---------|---------|-------|
| Clients / Projects / Tasks / Invoices | Often `staleTime: 60_000` + `keepPreviousData` | Shorter than global for CRM freshness |
| Settings | Multiple hooks with explicit stale times | Keep |
| Auth `me` | Cached carefully | Do not broaden persist |
| Reports analytics / insights | Tab-gated `enabled` | Good — avoid idle insights fetch |
| AI conversations / documents | Default global stale | OK; invalidate on mutations |

## Invalidation

| Area | Pattern | Assessment |
|------|---------|------------|
| AI mutations | Invalidate list + detail keys | Correct |
| Reports export | Mutation only | Correct |
| Files / notifications | Broad invalidate helpers | Watch over-invalidation in Phase 2 |

## Duplicate request risks

| Risk | Mitigation today | Phase 2 idea |
|------|------------------|--------------|
| Same list mounted twice | Unlikely with keep-alive single active page | — |
| Insights + analytics on Reports Insights tab | Intentional when business summary / timeline flags ON | Share one query key snapshot |
| Filter sheet loading clients/projects/teams | Fetches when advanced filters open | Could add `enabled: open` on hooks (behavior-preserving) |

## Opt-in overlay

`getPerformanceQueryDefaultOverlay()` returns `null` when `PERFORMANCE_QUERY_TUNING` is OFF. Phase 1 does **not** merge it into `createQueryClient` so production defaults stay bit-identical.
