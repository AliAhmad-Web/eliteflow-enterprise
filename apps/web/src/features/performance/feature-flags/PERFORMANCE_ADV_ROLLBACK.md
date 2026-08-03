# Advanced Performance Rollback Strategy (Phase 5)

**Goal:** Every ADV optimization disables via env without a code rollback.

---

## Principles

1. **Default OFF** — production matches baseline when flags unset.  
2. **Independent flags** — disable virtualization without disabling vitals, etc.  
3. **Fail open to baseline** — misconfigured ADV opts should not brick navigation.  
4. **Compose with Task 1.4** — turning OFF `PERFORMANCE_ADV_*` must not require toggling `PERFORMANCE_*` unless intentionally coupled.

---

## Per-flag rollback

| Flag | Enable effect (Phase 2) | Rollback |
|------|-------------------------|----------|
| `VIRTUALIZATION` | AI / Team virtual lists | Unset → prior list/table rendering |
| `QUERY` / `QUERY_CACHE` | RQ 15m/120m overlay | Unset → 1.4 / baseline RQ defaults |
| `BUNDLE` / `CODE_SPLITTING` | Team gate + charts lazy | Unset → eager prior chunks |
| `PREFETCH` / `ROUTE_OPTIMIZATION` | Idle warm Team | Unset → current warmup only |
| `PROGRESSIVE_RENDER` / `STREAMING` | Suspense boundaries | Unset → children-only render |
| `PROFILING` / `WEB_VITALS` | Extra instrumentation | Unset → prior reporter only |
| `IMAGE_OPTIMIZATION` | (reserved) | Unset |
| `BUNDLE_ANALYSIS` | (reserved) | Unset |
| `HYDRATION` | (reserved) | Unset |
| `SCRIPT_LOADING` | (reserved) | Unset |

Restart `apps/web` after env changes.

---

## Emergency order

If UI breaks after enabling multiple ADV flags:

1. Disable `STREAMING` / `PROGRESSIVE_RENDER` / `HYDRATION`  
2. Disable `BUNDLE` / `CODE_SPLITTING` / `PREFETCH` / `ROUTE_OPTIMIZATION`  
3. Disable `VIRTUALIZATION` / `QUERY` / `QUERY_CACHE`  
4. Disable remaining ADV flags  
5. Confirm Task 1.4 `PERFORMANCE_*` state (usually leave as-was)

---

## Phase 2 verification

All `PERFORMANCE_ADV_*` unset → ADV code paths no-op (virtual OFF, ProgressiveBoundary passthrough, Team eager, no Team prefetch, no ADV query overlay, no ADV profiler logs).
