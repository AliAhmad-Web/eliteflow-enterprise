# Enterprise Communication Architecture (Phase 7 Phase 1)

**Status:** Architecture only. No live integrations.  
**Constraint:** Compose on AI Assistant, Action Framework, Automation, Notifications, Email — no new communication product module.

---

## Design principles

1. **Channels are delivery adapters** — business intent lives in EliteFlow (AI plan, triggers, approvals).
2. **One orchestration spine** — `NotificationDispatcher` + Action Execution + optional Automation (n8n).
3. **Flag every enhancement** — `COMMUNICATION_*` default OFF; independent rollback.
4. **Reuse permissions & audit** — existing `ai:use`, notification prefs, authorization audit.
5. **No schema / REST redesign in Phase 1** — Phase 2 fills stubs and client modalities only.

---

## Layering (planned)

```
Sources
  ├─ AI Assistant (text / future voice) → Action Framework
  ├─ ERP triggers (notification.triggers)
  └─ Domain events (mention, invite, …)
        │
        ▼
Orchestration
  ├─ Action planning + approval (when write/send)
  ├─ Channel routing (IN_APP / EMAIL / WHATSAPP / …)
  └─ NotificationDispatcher.notify(...)
        │
        ▼
Delivery pipeline
  ├─ Queue (notifications)
  ├─ processNotificationQueue
  │     ├─ EMAIL → emailService
  │     └─ WHATSAPP → [Phase 2 provider]
  ├─ Retry / status (existing queue FAILED/SENT patterns)
  └─ Audit (notification audit + AI action audit)
```

---

## Planned capabilities

| Concern | Design |
|---------|--------|
| **AI-generated responses** | Draft via existing AI tools / EMAIL_ACTION; persist as draft until approval |
| **Communication orchestration** | Dispatcher + action execution status; n8n only after successful EliteFlow execution |
| **Approval workflow** | Reuse `action-execution-approval` — `awaiting_approval` blocks send |
| **Channel routing** | `sendEmail` + `extraChannels` + user prefs |
| **Delivery pipeline** | Existing notification queue processor |
| **Retry strategy** | Reuse queue reprocess endpoints; provider-specific backoff in Phase 2 |
| **Audit logging** | Existing notification audit + AI action audit trails |
| **Status tracking** | Queue item status (PENDING / SENT / FAILED) — no new status DB |

---

## Channel ownership

| Channel | Owner | Phase 2 flag |
|---------|-------|--------------|
| In-app | Communication + Notifications | (existing) |
| Email | `emailService` via EMAIL queue | `EMAIL_AUTOMATION` / `EMAIL_TEMPLATES` |
| WhatsApp | WHATSAPP queue provider | `WHATSAPP_INTEGRATION` / `WHATSAPP_MESSAGING` |
| Voice I/O | AI Assistant modality | `VOICE_*` / `SPEECH_*` / `TEXT_TO_SPEECH` |
| AI assist | Composer + action plans | `AI_ASSISTANT` |

---

## BI reuse (optional)

Where outbound volume or delivery health is useful, compose from existing Reports / notification metrics — **no new BI dashboard**. Presentation only under existing `/reports` if later desired.

---

## Explicit non-goals

- New Voice / WhatsApp / Email Automation modules
- New routes or dashboards
- Live telephony / calling
- Provider connections in Phase 1
- Database or REST contract changes

---

*Phase 2 may implement adapters behind flags; Phase 1 stops at this design.*
