# Performance Regression Checklist (Task 1.4)

Run with **all `PERFORMANCE_*` flags OFF** (default) after any Phase 2 change, then optionally re-run with Phase 2 flags ON.

## Functional non-regression

| # | Scenario | Pass |
|---|----------|------|
| 1 | Login / session restore | ☐ |
| 2 | Dashboard loads | ☐ |
| 3 | AI Assistant send / history | ☐ |
| 4 | AI Documents CRUD | ☐ |
| 5 | Reports tabs + export | ☐ |
| 6 | Soft nav between keep-alive routes | ☐ |
| 7 | Hard refresh restores allowlisted RQ cache | ☐ |

## Performance flags

| # | Check | Pass |
|---|-------|------|
| 8 | Flags OFF = identical UX to pre–1.4 | ☐ |
| 9 | `RENDER_PROFILING` ON (dev) logs only, no UI change | ☐ |
| 10 | Query / memo flags OFF do not alter QueryClient | ☐ |
| 11 | With Phase 2 flags ON: AI/Docs/Reports still correct | ☐ |
| 12 | `ROUTE_PREFETCH` ON: idle warm does not break auth | ☐ |
| 13 | `BUNDLE_OPTIMIZATION` ON: Reports charts still render | ☐ |

## Rollback

| # | Check | Pass |
|---|-------|------|
| 14 | Unset all `NEXT_PUBLIC_PERFORMANCE_*` + restart → baseline | ☐ |
