# Phase 7 – Phase 2 Regression Matrix

| Matrix | Expectation |
|--------|-------------|
| All `COMMUNICATION_*` OFF | Baseline AI Assistant, Notifications, Email queue (pre–Phase-7) |
| `VOICE_AI` ON alone | Voice toggle appears; no PTT unless `SPEECH_UI` / `SPEECH_TO_TEXT` |
| `SPEECH_UI` ON (+ Voice) | Hold-to-talk UI; STT deferred toast on empty release |
| `VOICE_ACTIONS` / `VOICE_COMMANDS` ON | Hint + status that Action Framework is reused |
| `VOICE_ASSISTANT` ON | After stream, phase returns to listening |
| `WHATSAPP` ON | Enriched WHATSAPP payload + audit when extraChannels used |
| `WHATSAPP_QUEUE` ON | Claim + process WHATSAPP → `PROVIDER_DEFERRED` failure |
| `EMAIL_AUTOMATION` ON | EMAIL payload automation metadata + audit |
| `EMAIL_TEMPLATES` ON | Template HTML / footer enhancement |
| `ORCHESTRATION` ON | Extra audits / status copy |
| `STATUS` ON | Notification Center delivery status strip |
| `FEEDBACK` ON | Preference save feedback + AI toasts when voice used |
| All ON | Combined surfaces; no REST/schema breaks |

Rollback: unset all `NEXT_PUBLIC_COMMUNICATION_*` / `COMMUNICATION_*` → restart web + API.
