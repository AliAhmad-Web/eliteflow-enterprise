# Phase M3 — Implementation Plan

**Status:** Awaiting approval.

M2 delivered CRM modules (clients, projects, tasks, calendar) and offline-ready React Query persistence. M3 deepens mobility, reliability, and AI.

---

## Goals

1. Full offline mutation queue (outbox) with replay on reconnect  
2. Push notifications (Expo Notifications) if backend push hooks exist — otherwise in-app only polish  
3. AI Assistant streaming chat against `/api/v1/ai`  
4. Project create/edit on mobile (admin write flows)  
5. Calendar create/edit/move events  
6. Biometric unlock for session restore  
7. Image/avatar optimization + attachment previews  
8. Invoices / clients billing read views (stretch)

---

## Scope

### Offline sync
- Mutation outbox in AsyncStorage
- Idempotent replay for create/update/delete
- Conflict UI when server rejects stale writes
- NetInfo connectivity banner

### AI
- Conversation list + streaming bubbles
- `POST /api/v1/ai/chat` + `/chat/stream`
- Permission: `ai:use`

### Calendar write
- Create / edit / delete / move via existing calendar write APIs

### Projects write
- Create / edit / milestone edits for `projects:write` roles

### Security UX
- Optional biometric gate before showing cached shell
- Session management screen (already on web APIs)

### Quality
- E2E smoke (Detox or Maestro): login → clients → tasks → logout
- Performance pass on low-end Android lists

---

## Out of scope

- New backend endpoints (unless a production refresh-cookie exposure bug is separately approved)
- Web UI changes
- App Store submission pipeline (candidate M4)

---

## Acceptance criteria

- [ ] Offline create/edit survives airplane mode and syncs later  
- [ ] AI chat streams on device  
- [ ] Calendar CRUD works for `calendar:write`  
- [ ] No web/API/DB changes without explicit approval  
- [ ] `npm run mobile:type-check` clean  

---

## Approval

Reply with **Approve M3** (and any scope cuts) to begin.
