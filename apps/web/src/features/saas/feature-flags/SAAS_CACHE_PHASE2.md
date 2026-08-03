# Cache Strategy — Phase 8 Phase 2

**Flag:** `SAAS_CACHE_STRATEGY`

## Implemented

| Item | Detail |
|------|--------|
| RQ overlay | `getSaasCacheDefaultOverlay` — 8m stale / 100m gc |
| Stable keys | `buildStableQueryKey` (+ tenant segment when tenant flag ON) |
| Invalidation | `invalidateQueryRoot` |
| Reuse check | `shouldReuseCachedQuery` |

## Files

- `features/saas/utils/cache-strategy.ts`
- Wired in `services/api/query-client.ts`

## Non-goals

Redis, CDN, server-side distributed cache.
