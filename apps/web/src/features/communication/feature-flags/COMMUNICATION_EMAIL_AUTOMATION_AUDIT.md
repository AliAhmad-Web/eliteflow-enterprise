# Email Automation Audit (Phase 7 Phase 1)

**Status:** Audit + architecture fit only. No SMTP redesign or provider migration.  
**Constraint:** Do not create an Email Automation module. Reuse `emailService` + notification queue + AI Action Framework.

---

## Summary

Transactional email already works through **`emailService`** and the **notification EMAIL queue**. AI can **draft** email (`draft_email` tool / EMAIL_ACTION) but does **not** send. Email automation = approved orchestration onto existing send paths, not a new mailer product.

---

## 1. Mailer abstraction (existing)

| Path | Role |
|------|------|
| `apps/api/src/integrations/email/email.service.ts` | Singleton `emailService` |
| `apps/api/src/config/email.config.ts` | SMTP / Gmail / Resend / relay config |
| `gmail-api.sender.ts` / `github-email-relay.ts` | Transport helpers |
| `email-runtime-config.ts` | Runtime Resend key (Integration Center) |

**Transports (priority):** `gmail_api` → `github_relay` → `smtp` → `resend` → `none`.

**Public methods:**

- Auth: `sendPasswordResetEmail` / `sendVerificationEmail` / `sendOtpEmail`
- Notifications: `sendNotificationEmail({ to, subject, html, text })`

---

## 2. Notification emails

- Built in dispatcher (`buildEmailHtml` / `buildEmailText`)
- Templates: `NotificationTemplate` (+ optional `emailTemplate`)
- `notifyFromTemplate()` interpolates `{{vars}}`
- Triggers default `sendEmail: true` for many ERP reminders

Org identity fields exist on `OrganizationSettings` (`emailFromName` / `emailFromAddress` / `emailReplyTo`); transactional from-address is still driven mainly by `email.config.ts`.

---

## 3. CRM / contacts

- Clients and users store `email` (+ `phone`)
- No dedicated “send email to client” CRM workflow today
- CRM email is **data + AI draft**, not delivery

---

## 4. AI document / draft email

| Artifact | Behavior |
|----------|----------|
| Tool `draft_email` | Returns `{ kind: "email_draft", subject, body, to }` — **does not send** |
| `save_ai_document` | Persists document — **no email** |
| Builtin `EMAIL_ACTION` | Planning metadata (draft/summarize/list) |
| Action executor `category: "email"` | Maps to CRM **read**, not `emailService` |

Write capabilities (`notify`, `draft`, `create`, …) remain blocked until approval clears.

---

## 5. Automation architecture

```
… → actionPlanning → workflowOrchestration → actionExecution → automation → …
```

- `resolveAutomationExecution` — n8n provider stub; EliteFlow owns business logic
- Flags: `AI_AUTOMATION_ENGINE`, `AI_N8N_INTEGRATION`, …

Email automation must **not** auto-execute send from n8n without EliteFlow approval + dispatcher.

---

## 6. Reusable enterprise email automation (planned)

| Capability | Flag | Mechanism |
|------------|------|-----------|
| Automated sends | `COMMUNICATION_EMAIL_AUTOMATION` | Triggers / approved AI → `notify({ sendEmail: true })` → queue → `emailService` |
| Template enrichment | `COMMUNICATION_EMAIL_TEMPLATES` | Prefer `NotificationTemplate` / `emailTemplate` |
| AI communication assistant | `COMMUNICATION_AI_ASSISTANT` | Draft via existing tools; send only after approval |

```
AI draft / ERP trigger
        │
        ▼
Approval gate (Action Framework) ──when required──┐
        │                                           │
        ▼                                           ▼
NotificationDispatcher.notify({ sendEmail: true })
        │
        ▼
EMAIL queue → emailService.sendNotificationEmail()
```

---

## Explicit non-goals

- SMTP redesign / provider migration
- New Email Automation module or routes
- Treating `draft_email` / `AiDocument` as senders
- Bypassing approval for write/send capabilities
- Schema or REST contract changes in Phase 1

---

*Phase 2 may wire approved send paths behind flags; Phase 1 stops here.*
