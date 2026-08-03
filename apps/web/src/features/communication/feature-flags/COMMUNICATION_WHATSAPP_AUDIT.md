# WhatsApp Integration Audit (Phase 7 Phase 1)

**Status:** Audit + architecture fit only. No WhatsApp Business API / Twilio.  
**Constraint:** Do not create a WhatsApp module. Do not route WhatsApp through in-app Communication chat.

---

## Summary

WhatsApp is already **modeled as a notification channel** (`NotificationChannel.WHATSAPP`) with preferences and a queue stub that marks delivery FAILED (“provider not integrated yet”). Phase 2 completes the provider inside the existing notification pipeline — it does not invent a new messaging product surface.

---

## 1. In-app Communication (not the WhatsApp carrier)

| Area | Path | Notes |
|------|------|-------|
| Web feature | `apps/web/src/features/communication/` | DMs, channels, announcements, threads, meetings |
| API | `apps/api/src/modules/communication/` | Internal messaging + hub |
| Schema | `packages/database/prisma/schema/communication.prisma` | Internal `Conversation` / `Message` |

Outbound today is **in-app only**. Mentions/invites fan out via `notificationDispatcher`.  
**Do not** add WhatsApp as a `ConversationType` or MessageKind in Phase 7.

---

## 2. Notifications — primary WhatsApp seam

| Artifact | Role |
|----------|------|
| `notification.dispatcher.ts` | `NotificationDispatcher.notify()` — IN_APP + EMAIL + `extraChannels` |
| `notifications.service.ts` | `processQueue` / `runTriggers` |
| `notification.triggers.ts` | ERP reminders (tasks, invoices, calendar, leave) |
| Schema | `notifications.prisma` — prefs, templates, queue, audit |
| Enum | `NotificationChannel.WHATSAPP` |

**Current fan-out:**

```
Domain event / trigger / admin create
  → NotificationDispatcher.notify()
      → IN_APP (if pref)
      → enqueue EMAIL (if sendEmail)
      → enqueue PUSH / SMS / WHATSAPP (if extraChannels + pref)
  → processNotificationQueue()
      → EMAIL → emailService.sendNotificationEmail()
      → WHATSAPP → FAILED stub ("provider not integrated yet")
```

Admin endpoints already exist: queue process + triggers run.

---

## 3. Preferences & identity

| Field | Location |
|-------|----------|
| `whatsappEnabled` | `NotificationPreference` |
| `whatsappNotifications` | `UserPreference` (settings UI: “WhatsApp (future ready)”) |
| Phone destinations | `User.phone` / `Client.phone` / `EmployeeProfile.phone` |

Queue payload already supports destination addressing without schema change.

---

## 4. Action / Automation fit

| Layer | Fit |
|-------|-----|
| Action Framework | Planned `notify` write capability — blocked until approval clears |
| Automation / n8n | Post–action-execution executor (`foundation/automation/`); stub today |
| Approval | High-risk / write actions → `awaiting_approval`; automation refuses until cleared |

WhatsApp outbound from AI must go through **approval → dispatcher → queue**, never auto-send from the LLM.

---

## 5. Architecture fit (planned)

```
Event / AI plan (approved)
        │
        ▼
NotificationDispatcher.notify({ extraChannels: [WHATSAPP] })
        │
        ├─ IN_APP (existing)
        ├─ EMAIL queue (existing)
        └─ WHATSAPP queue → [Phase 2] provider in processNotificationQueue
```

| Capability | Flag | Extend here |
|------------|------|-------------|
| Provider wiring | `COMMUNICATION_WHATSAPP_INTEGRATION` | `processNotificationQueue` WHATSAPP case |
| Outbound messaging | `COMMUNICATION_WHATSAPP_MESSAGING` | Dispatcher enqueue + pref checks |

---

## Explicit non-goals (Phase 1 / Phase 2 constraints)

- No WhatsApp module or dashboard
- No new REST contracts or schema redesign
- No Twilio / Meta Business API in Phase 1
- No WhatsApp conversations inside Communication hub
- No bypass of notification prefs or approval gates

---

*Phase 2 may implement the WHATSAPP queue provider behind flags; Phase 1 stops here.*
