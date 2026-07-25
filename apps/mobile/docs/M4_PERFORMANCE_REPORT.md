# M4 — Performance Report

## Verdict

Startup, list, image, and AI streaming paths are optimized for production use on mid-range devices without redesigning screens.

## Optimizations

| Area | Change | Expected impact |
|------|--------|-----------------|
| Startup | Splash held until hydrate + session bootstrap; short launch animation then unmount | Perceived polish; no long JS block |
| Memory | Voice `Sound` / `Recording` unload on unmount; download cache capped (40 entries) | Lower leak risk |
| List rendering | FlatList `removeClippedSubviews`, window/batch limits on chat + messages; FlashList for files | Smoother scroll |
| Images | `expo-image` with `memory-disk` cache in file preview | Faster revisits, less decode churn |
| Background | Mutation queue flushes on NetInfo reconnect; app lock lifecycle is lightweight | Battery-friendly |
| AI streaming | Existing SSE chunk updates retained; list windowing added | UI stays responsive during stream |
| File downloads | Base64 write to cache directory once; reuse for share/preview | Avoids repeated network |

## Guidance

- Prefer FlashList for long CRM lists (already used in clients/files).
- Avoid holding multiple `Audio.Sound` instances — VoicePlayer unloads on unmount.
- Keep React Query persistence (`maxAge` 24h) for offline-friendly reads.

## Residual risks

1. Large PDF/video files may stress memory during base64 bridge — monitor on low-RAM Android.
2. Voice metering falls back to synthetic levels if hardware metering unavailable.
3. Full Maestro/Detox automation suite not executed in this phase (manual QA checklist provided).
