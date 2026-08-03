# Communication Feature Flags (Phase 7) — Production Activation

Env-based flags for EliteFlow Voice AI, WhatsApp Integration, Email Automation, and Email Workspace.

- **Email Automation / AI Email Workspace:** defaults **ON** (primary communication platform)
- **Voice AI + WhatsApp UI:** defaults **OFF** (temporarily hidden; code kept for re-enable)
- **EMAIL_AI_* executive enhancements:** defaults **OFF** when unset (opt-in)
- **Rollback / re-enable:** set env + restart web (no code deletion, no DB/API changes)

## Environment variables

| Logical flag | Env variable | Default | Notes |
|--------------|--------------|---------|-------|
| `COMMUNICATION_ENTERPRISE_FOUNDATION` | `NEXT_PUBLIC_COMMUNICATION_ENTERPRISE_FOUNDATION` | `true` | Activation |
| `COMMUNICATION_VOICE_AI` | `NEXT_PUBLIC_COMMUNICATION_VOICE_AI` | `false` | Voice UI (hidden) |
| `COMMUNICATION_VOICE_ASSISTANT` | `NEXT_PUBLIC_COMMUNICATION_VOICE_ASSISTANT` | `false` | Continuous session |
| `COMMUNICATION_VOICE_COMMANDS` | `NEXT_PUBLIC_COMMUNICATION_VOICE_COMMANDS` | `false` | Action hints |
| `COMMUNICATION_SPEECH_TO_TEXT` | `NEXT_PUBLIC_COMMUNICATION_SPEECH_TO_TEXT` | `false` | STT UI |
| `COMMUNICATION_TEXT_TO_SPEECH` | `NEXT_PUBLIC_COMMUNICATION_TEXT_TO_SPEECH` | `false` | TTS status |
| `COMMUNICATION_SPEECH_UI` | `NEXT_PUBLIC_COMMUNICATION_SPEECH_UI` | `false` | PTT / Start-Stop recording |
| `COMMUNICATION_VOICE_ACTIONS` | `NEXT_PUBLIC_COMMUNICATION_VOICE_ACTIONS` | `false` | Action Framework path |
| `COMMUNICATION_WHATSAPP*` | `NEXT_PUBLIC_COMMUNICATION_WHATSAPP*` | `false` | Channel + queue UI (hidden) |
| `COMMUNICATION_EMAIL_AUTOMATION` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_AUTOMATION` | `true` | Automation ops |
| `COMMUNICATION_EMAIL_TEMPLATES` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_TEMPLATES` | `true` | Templates |
| `COMMUNICATION_STATUS` / `FEEDBACK` / `ORCHESTRATION` / `AI_ASSISTANT` | matching env | `true` | UX + orchestration |
| `COMMUNICATION_EMAIL_WORKSPACE` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_WORKSPACE` | `true` | Enterprise mailbox UI |
| `COMMUNICATION_EMAIL_AI` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_AI` | `true` | AI drafting agent |
| `COMMUNICATION_EMAIL_THREADS` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_THREADS` | `false` | Threaded conversations |
| `COMMUNICATION_EMAIL_VOICE` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_VOICE` | `false` | Voice-controlled email |
| `COMMUNICATION_EMAIL_SEARCH` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_SEARCH` | `false` | Enterprise search filters |
| `COMMUNICATION_EMAIL_SHARED_INBOX` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_SHARED_INBOX` | `false` | Team shared mailboxes |
| `COMMUNICATION_EMAIL_SMART_REPLY` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_SMART_REPLY` | `false` | Smart reply / AI actions |
| `COMMUNICATION_EMAIL_SCHEDULE` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_SCHEDULE` | `false` | Schedule send |
| `COMMUNICATION_EMAIL_ENTERPRISE_UI` | `NEXT_PUBLIC_COMMUNICATION_EMAIL_ENTERPRISE_UI` | `false` | Shortcuts / polish |
| `EMAIL_AI_*` | `NEXT_PUBLIC_EMAIL_AI_*` | `false` | Executive enhancements (opt-in) |

Accepted truthy: `1`, `true`, `yes`, `on`. Falsy: `0`, `false`, `no`, `off`.

Any `EMAIL_AI_*` flag ON also unlocks the Email Workspace shell (same page; no new module).

## Re-enable Voice AI / WhatsApp (rollback of temporary hide)

```bash
# Voice AI UI
NEXT_PUBLIC_COMMUNICATION_VOICE_AI=true
NEXT_PUBLIC_COMMUNICATION_VOICE_ASSISTANT=true
NEXT_PUBLIC_COMMUNICATION_SPEECH_TO_TEXT=true
NEXT_PUBLIC_COMMUNICATION_SPEECH_UI=true

# WhatsApp UI
NEXT_PUBLIC_COMMUNICATION_WHATSAPP=true
NEXT_PUBLIC_COMMUNICATION_WHATSAPP_INTEGRATION=true
NEXT_PUBLIC_COMMUNICATION_WHATSAPP_MESSAGING=true
NEXT_PUBLIC_COMMUNICATION_WHATSAPP_QUEUE=true
```

## Hide Email enhancements (keep Email Automation ops)

```bash
NEXT_PUBLIC_COMMUNICATION_EMAIL_WORKSPACE=false
NEXT_PUBLIC_COMMUNICATION_EMAIL_AI=false
```

Restart `apps/web` after env changes.
