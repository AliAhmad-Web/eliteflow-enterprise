# Phase 20 — Enterprise Communication Hub Testing Checklist

Use this checklist after `prisma migrate` + `seed` and with demo users (`superadmin@`, `admin@`, `employee@`, `client@`).

---

## Prerequisites

- [ ] Migration `20260724170000_communication_hub_phase20` applied
- [ ] `npx prisma generate` succeeded
- [ ] Seed completed (announcements / threads / meetings counts > 0)
- [ ] Gemini integration key configured **or** mock AI provider available for AI tests

---

## RBAC

- [ ] Admin has `communication:*`, `announcement:manage`, `meeting:manage`, `thread:manage`
- [ ] Employee has `communication:read` + `communication:write` (no announcement/meeting manage unless granted)
- [ ] Client can open Messages / Channels (read/write) but cannot create announcements
- [ ] Route guard blocks `/announcements` create UI without `announcement:manage`
- [ ] Legacy JWT with only `chat:read` / `chat:write` still reaches `/messages`

---

## Internal Chat

- [ ] Direct message create + send
- [ ] Group chat create
- [ ] Team / Department / Organization channel appears under **Channels**
- [ ] Mentions notify mentioned user (Notification Center)
- [ ] Read receipts update after mark-read
- [ ] Typing indicator appears for other member (poll/presence)
- [ ] Reaction add/remove
- [ ] File attachment on message
- [ ] Voice note architecture: send message with `kind: VOICE` + audio attachment metadata (`durationSeconds`)
- [ ] Message search (global + in-thread)
- [ ] Pin / unpin message; pinned list loads

---

## Announcement Center

- [ ] Admin creates announcement (priority, optional department, expiry, pin, attachments)
- [ ] List shows pinned first / priority badges
- [ ] Mark as read records `AnnouncementRead`
- [ ] Expired announcements hidden or marked (per UI rules)
- [ ] Non-managers cannot POST `/communication/announcements` (403)
- [ ] Notification delivered on publish
- [ ] Activity feed shows `announcement.created`

---

## Discussion Threads

- [ ] Create thread with category + tags
- [ ] Nested reply (parentId)
- [ ] Resolve thread (`thread:manage`)
- [ ] Pin thread
- [ ] Reply mention notifies user
- [ ] Soft-delete thread (manage)
- [ ] Activity: `thread.resolved`

---

## Meetings (architecture only)

- [ ] Schedule meeting with participants
- [ ] Invitees receive notification (Calendar/TEAM category)
- [ ] Waiting room flag visible; participant status INVITED → WAITING → ADMITTED → JOINED (API)
- [ ] Add recording **metadata** (no media upload required beyond URL fields)
- [ ] Record screen-share **metadata** start/end
- [ ] UI states WebRTC is future / architecture only
- [ ] Cancel / end meeting updates status
- [ ] Activity: `meeting.scheduled`

---

## Notification Bridge

- [ ] Chat message (non-self) notifies members (existing behavior)
- [ ] Mention → notification
- [ ] Announcement → notification
- [ ] Thread reply → notification
- [ ] Meeting invite → notification
- [ ] All appear in Notification Center (no duplicate notification tables)

---

## Gemini AI (`POST /communication/ai`)

- [ ] Summarize conversation (`SUMMARIZE_CONVERSATION`)
- [ ] Meeting summary (`MEETING_SUMMARY`)
- [ ] Action items (`ACTION_ITEMS`)
- [ ] Translate (`TRANSLATE` + `targetLanguage`)
- [ ] Follow-up tasks (`FOLLOW_UP_TASKS`) returns suggestions (and tasks only if permitted)
- [ ] Uses `getAiProvider()` — no second AI stack
- [ ] Requires `ai:use`

---

## Activity & Audit

- [ ] Message sent / edited / deleted appears in Activity
- [ ] Announcement created audited (`auditLog` resource `communication`)
- [ ] Meeting scheduled audited
- [ ] Thread resolved audited
- [ ] Activity page filters ANNOUNCEMENT / MEETING / THREAD

---

## Frontend / UX

- [ ] Sidebar **Communication** section visible
- [ ] `/messages`, `/channels`, `/announcements`, `/threads`, `/meetings`, `/activity` load
- [ ] Channel row deep-links into Messages
- [ ] Responsive layout (mobile drawer / stacked lists)
- [ ] Dark theme readable (contrast on badges/list rows)
- [ ] No regression on Settings, Billing, Reports, Integrations, AI Assistant

---

## Negative / security

- [ ] Unauthenticated requests → 401
- [ ] Cross-user cannot read private DM without membership
- [ ] Client cannot soft-delete org announcements
- [ ] Meeting host/manage permission enforced on participant admit
- [ ] Soft-deleted rows excluded from lists

---

## Sign-off

| Role | Tester | Date | Pass |
|------|--------|------|------|
| Admin | | | |
| Employee | | | |
| Client | | | |
