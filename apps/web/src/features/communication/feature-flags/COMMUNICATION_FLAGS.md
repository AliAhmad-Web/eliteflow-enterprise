# Communication Feature Flags (Phase 7) — Production Activation

Env-based flags for EliteFlow Voice AI, WhatsApp Integration, Email Automation, and Email Workspace.

- **AI Agent** (AI Assistant voice + Email Executive AI): defaults **ON**
- **Standalone sidebar pages** `/voice-ai` and `/whatsapp`: defaults **OFF** (`*_PAGE` flags)
- Re-enable pages: set `NEXT_PUBLIC_COMMUNICATION_VOICE_AI_PAGE=true` / `WHATSAPP_PAGE=true` + restart web

## Standalone pages vs AI Agent

| Surface | Flag | Default |
|---------|------|---------|
| Sidebar + `/voice-ai` page | `COMMUNICATION_VOICE_AI_PAGE` | `false` |
| Sidebar + `/whatsapp` page | `COMMUNICATION_WHATSAPP_PAGE` | `false` |
| AI Assistant voice / STT / TTS | `COMMUNICATION_VOICE_*` | `true` |
| Email Automation executive AI | `COMMUNICATION_EMAIL_*` + `EMAIL_AI_*` | `true` |

Hiding the Voice AI / WhatsApp **pages** does **not** disable the AI Agent inside AI Assistant or Email Automation.

## Environment variables (summary)

| Logical flag | Env variable | Default |
|--------------|--------------|---------|
| `COMMUNICATION_VOICE_AI_PAGE` | `NEXT_PUBLIC_COMMUNICATION_VOICE_AI_PAGE` | `false` |
| `COMMUNICATION_WHATSAPP_PAGE` | `NEXT_PUBLIC_COMMUNICATION_WHATSAPP_PAGE` | `false` |
| `COMMUNICATION_VOICE_*` | matching env | `true` |
| `COMMUNICATION_WHATSAPP*` | matching env | `true` |
| `COMMUNICATION_EMAIL_*` workspace | matching env | `true` |
| `EMAIL_AI_*` | matching env | `true` |

Accepted truthy: `1`, `true`, `yes`, `on`. Falsy: `0`, `false`, `no`, `off`.

## Re-enable standalone pages

```bash
NEXT_PUBLIC_COMMUNICATION_VOICE_AI_PAGE=true
NEXT_PUBLIC_COMMUNICATION_WHATSAPP_PAGE=true
```

Restart `apps/web` after env changes.
