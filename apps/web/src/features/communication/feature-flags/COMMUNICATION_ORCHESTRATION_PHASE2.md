# Communication Orchestration — Phase 7 Phase 2

**Flag gate:** `COMMUNICATION_ORCHESTRATION`

## Design

Single planning helper composes intended channels; execution remains:

```
AI Assistant / ERP trigger
  → Action Framework (approval when required)
  → NotificationDispatcher.notify
  → EMAIL / WHATSAPP / IN_APP queues
  → emailService | provider-deferred WhatsApp
  → NotificationAudit
```

## Implemented

| Item | Detail |
|------|--------|
| Plan helper | `composeCommunicationOrchestration` |
| Audit hooks | Extra queue audits when orchestration / channel flags ON |
| Status UX | Labels via `deliveryStatusLabel` + Notification Center strip (`STATUS`) |

## Non-goals

No duplicate execution engine. No new REST endpoints. n8n remains optional post-action executor (existing Automation Framework).
