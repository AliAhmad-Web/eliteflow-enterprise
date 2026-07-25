# Phase 20 — Performance Optimization Testing Checklist

Prerequisites: API + web running; Admin user; Network tab + React Profiler optional.

---

## Lazy loading / code splitting

- [ ] Open `/clients` — Network shows a separate chunk for clients page content
- [ ] Open `/team` — large team module loads only after navigation (not in initial dashboard bundle)
- [ ] `/reports`, `/calendar`, `/file-manager`, `/ai-assistant` show loading fallback then content
- [ ] Feature error boundary: force a throw in a lazy child → retry restores subtree (dev only)

---

## Search / tables

- [ ] Type quickly in Clients search — API calls wait ~300ms after last keystroke
- [ ] Same for Projects, Tasks, Invoices, Files, Team
- [ ] Server-side pagination still changes pages correctly
- [ ] Mobile width: CRM card lists scroll virtually (DOM node count stays low for long pages)
- [ ] Sorting still works after debounce/virtualization

---

## TanStack Query cache

- [ ] Navigate Clients → Projects → Clients within 60s — list may paint from cache without full reload spinner
- [ ] Mutation (create client) still invalidates and refreshes list
- [ ] No duplicate identical GETs for the same query key while one is in flight
- [ ] Window focus does **not** refetch all queries

---

## API / database

- [ ] Response headers include `Content-Encoding: gzip` (or br) on JSON lists where client accepts encoding
- [ ] Projects list payload has empty or absent heavy nested milestones/attachments vs detail
- [ ] Invoice list payload has empty `items` array; detail still returns line items
- [ ] Task list omits attachment blobs; detail includes attachments
- [ ] Slow request (≥500ms) logs `[perf] slow_request` when forced (optional)

---

## Assets / vitals

- [ ] Fonts load with `font-display: swap` (no invisible text flash forever)
- [ ] `OptimizedImage` usable for remote avatars when wired
- [ ] DevTools console shows `[web-vital]` metrics in development
- [ ] `window.__ELITEFLOW_VITALS__` accumulates entries

---

## Security regression

- [ ] Login / JWT refresh still works
- [ ] CSRF still blocks unsafe requests without token
- [ ] RBAC still hides unauthorized modules
- [ ] Rate limiting still engages on auth endpoints

---

## Memory / render smoke

- [ ] Navigate across 10 modules — no continuous memory climb when returning to idle
- [ ] Communication conversation list still virtualizes
- [ ] Existing features (invoice PDF, task CRUD, chat send) still work

---

## Sign-off

| Check | Pass |
|-------|------|
| Lazy routes | |
| Debounced search | |
| Slim list queries | |
| Compression | |
| Cache behavior | |
| Security intact | |
