# Provider Integration — Rollback Verification

## Feature flags (immediate UI/API disable)

Set any of:

```
NEXT_PUBLIC_COMMUNICATION_VOICE_AI=false
NEXT_PUBLIC_COMMUNICATION_SPEECH_TO_TEXT=false
NEXT_PUBLIC_COMMUNICATION_TEXT_TO_SPEECH=false
NEXT_PUBLIC_COMMUNICATION_WHATSAPP=false
NEXT_PUBLIC_COMMUNICATION_WHATSAPP_QUEUE=false
NEXT_PUBLIC_COMMUNICATION_EMAIL_AUTOMATION=false
```

Mirror on API: `COMMUNICATION_*=false` (see `apps/api/src/config/communication-flags.ts`).

## Provider env rollback

| Provider | Action | Effect |
|---|---|---|
| Voice | `NEXT_PUBLIC_VOICE_PROVIDER=none` | STT/TTS disabled; type-only |
| WhatsApp | Clear `WHATSAPP_ACCESS_TOKEN` / `PHONE_NUMBER_ID` | Queue marks `PROVIDER_DEFERRED` |
| Email | Clear transport credentials | Send fails safely; queue FAILED |

## Verify after rollback

1. Voice controls hidden or STT/TTS warnings; typed chat still works
2. WhatsApp queue does not call Meta
3. Email automation metadata off (if flag false); core app auth email still uses emailService independently

## No schema / migration rollback required

Integration is env + code paths only.
