# Performance Baseline (Task 1.4 Phase 1)

Regression baseline for EliteFlow web. Measure after cold start and after warm keep-alive navigation. Capture with DevTools Performance / Network and `window.__ELITEFLOW_VITALS__` (see `WebVitalsReporter`).

## How to capture

1. Production build: `npm run build && npm run start` in `apps/web`
2. Chrome DevTools → Performance + Network (disable cache for cold load)
3. Optional: `ANALYZE=true` when bundle analyzer is available
4. Record Core Web Vitals via console `[web-vital]` logs (dev) or `__ELITEFLOW_VITALS__`

| Metric | Target (guideline) | Cold | Warm | Notes |
|--------|--------------------|------|------|-------|
| LCP | < 2.5s | ☐ | ☐ | |
| INP | < 200ms | ☐ | ☐ | |
| CLS | < 0.1 | ☐ | ☐ | |
| TTFB | < 800ms | ☐ | ☐ | |
| JS transferred (first route) | trend ↓ | ☐ | — | |

## Surface checklist

| Surface | Route | Cold load | Warm / keep-alive | Notes |
|---------|-------|-----------|-------------------|-------|
| App shell / login | `/login` | ☐ | ☐ | |
| Dashboard | `/dashboard` (or home) | ☐ | ☐ | |
| AI Assistant | `/ai-assistant` | ☐ | ☐ | Streaming separate |
| AI Documents | `/ai-documents` | ☐ | ☐ | |
| Reports & Analytics | `/reports` | ☐ | ☐ | Charts SVG |
| Route transition (A→B) | any pair | ☐ | ☐ | Keep-alive cache |

## Bundle composition (manual)

| Chunk class | Observe | Status |
|-------------|---------|--------|
| Framework (Next/React) | first load JS | ☐ |
| Shared UI / lucide / framer | optimizePackageImports already | ☐ |
| Feature route chunks | keep-alive + dynamic() | ☐ |
| Reports charts | `simple-charts` | ☐ |
| AI markdown / stream | assistant page | ☐ |

## React Query baseline

| Area | Current default | Status |
|------|-----------------|--------|
| Global `staleTime` | 5 min | Documented |
| `refetchOnWindowFocus` | false | Documented |
| `refetchOnMount` | false | Documented |
| `placeholderData` | keepPreviousData | Documented |
| LocalStorage persist | 24h, allowlisted prefixes | Documented |

## Lazy-loaded components (inventory)

| Loader | Mechanism |
|--------|-----------|
| Clients / Projects / Tasks / Invoices / Team / Reports / Calendar / Files / AI Assistant | `lazy-feature-pages.tsx` + keep-alive registry |
| Integration charts | `dynamic()` in monitoring tabs |
| Settings heavy sections | `settings-heavy-sections.tsx` |

## Sign-off

| Role | Date | Pass |
|------|------|------|
| FE | | ☐ |

Baseline date: _______________  
Build SHA: _______________
