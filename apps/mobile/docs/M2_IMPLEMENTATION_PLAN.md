# Phase M2 — Implementation Plan

**Status:** Awaiting approval before implementation.

M1 delivered the mobile shell, auth, themes, navigation, and a live dashboard foundation. M2 expands module depth against the **existing** `/api/v1` surface — still no backend duplication.

---

## Goals

1. Ship full mobile workflows for core ERP modules
2. Wire AI chat to existing streaming endpoints
3. Deepen notifications and search beyond navigation shortcuts
4. Preserve RBAC parity with web via `@enterprise/shared`
5. Keep web / API / DB unchanged

---

## Scope

### 1. Projects module
- List + filters + pull-to-refresh (`GET /api/v1/projects`)
- Detail screen (`GET /api/v1/projects/:id`)
- Status / priority chips using shared enums
- Create / edit forms only where `projects:write` allows

### 2. Tasks module
- My tasks + filters (`GET /api/v1/tasks`)
- Detail, status updates, comments if APIs already expose them
- Overdue / priority highlighting

### 3. Calendar module
- Agenda / day views (`GET /api/v1/calendar/events`, `/upcoming`)
- Event detail; create/edit if `calendar:write`

### 4. AI Assistant
- Chat UI with conversation list
- `POST /api/v1/ai/chat` + `/chat/stream` via existing authenticated fetch patterns
- Permission gate: `ai:use`

### 5. Notifications depth
- Pagination, mark read / archive
- Preferences screen (`/api/v1/notifications` preference routes)
- Optional push registration prep (Expo Notifications) — **only if** existing backend push hooks exist; otherwise defer to M3

### 6. Global search (real)
- Replace navigation index with API-backed search across projects/tasks/clients as available endpoints allow
- Debounced TanStack Query

### 7. Clients / Invoices (stretch)
- Read-only lists if time permits (`/clients`, `/invoices`)
- Revenue drill-down from dashboard KPI

### 8. Profile & security
- Session list / revoke (`/api/v1/auth/sessions`)
- Change-password flow if already exposed under settings/security APIs

---

## Out of scope for M2

- New API endpoints or schema changes
- Rewriting web dashboard
- Offline-first sync engine (candidate for M3)
- Native biometric unlock (candidate for M3)
- App Store / Play Store release pipelines (M3+)

---

## Technical approach

| Area | Plan |
|------|------|
| Data | Feature folders under `src/features/*` with services mirroring web service paths |
| Caching | TanStack Query keys per entity; optimistic updates for mark-read / task status |
| Navigation | Keep drawer + tabs; add stack groups per module `(projects)`, `(tasks)`, etc. |
| Forms | Controlled inputs + Zod schemas from `@enterprise/shared` where available |
| Performance | Lazy `React.lazy` / Expo Router code splitting per module route; list virtualization |
| Testing | Smoke: login → dashboard → one module list → logout |

---

## Suggested delivery order

1. Projects list + detail  
2. Tasks list + detail + status  
3. Calendar agenda  
4. AI chat streaming  
5. Notifications preferences + pagination  
6. API search  
7. Sessions / security polish  

---

## Acceptance criteria

- [ ] All M2 screens call existing `/api/v1` only  
- [ ] Unauthorized modules hidden or blocked via `PERMISSIONS`  
- [ ] Themes continue to apply across new screens  
- [ ] No changes to `apps/web` or `apps/api` unless a **pre-existing** mobile cookie exposure bug is formally approved as a separate backend ticket  
- [ ] Type-check clean for `@enterprise/mobile`

---

## Approval

Reply with **Approve M2** (and any scope cuts) to begin implementation.
