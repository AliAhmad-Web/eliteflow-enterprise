# Observability — Phase 8 Phase 2

**Flags:** `SAAS_OBSERVABILITY`, `SAAS_HEALTH_MONITORING`

## Implemented

| Item | Detail |
|------|--------|
| Request timing | Enrichment via existing middleware + `[saas] request` logs |
| Health readiness | `buildSaasReadinessReport` (DB ping) — **logs only**; `/health` JSON unchanged |
| Flag diagnostics | `getSaasFeatureFlagDiagnostics` / web `getSaasFlagDiagnostics` |

## Files

- `request-timing.middleware.ts`
- `saas-health.helpers.ts`
- `routes/index.ts` health handler (side-effect logs)
- `features/saas/utils/observability.ts`

## Contract

`GET /api/v1/health` remains `{ status: "ok", timestamp }` regardless of flags.
