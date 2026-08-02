# AI Assistant UI Feature Flags (Wave W0)

Lightweight, env-based feature flags for EliteFlow AI Assistant UI upgrades.

- **No third-party service**
- **Defaults: all OFF** — existing `/ai-assistant` behavior unchanged
- **Rollback:** unset or set the flag to `false`, then restart the web app

## Environment variables

Next.js public env vars (must use `NEXT_PUBLIC_` so client components can read them):

| Logical flag | Env variable | Default |
|--------------|--------------|---------|
| `AI_UI_ENTERPRISE_SHELL` | `NEXT_PUBLIC_AI_UI_ENTERPRISE_SHELL` | `false` |
| `AI_UI_STREAM_CONTROLS` | `NEXT_PUBLIC_AI_UI_STREAM_CONTROLS` | `false` |
| `AI_UI_ENHANCED_FEEDBACK` | `NEXT_PUBLIC_AI_UI_ENHANCED_FEEDBACK` | `false` |
| `AI_UI_SKELETONS` | `NEXT_PUBLIC_AI_UI_SKELETONS` | `false` |
| `AI_UI_SHORTCUTS` | `NEXT_PUBLIC_AI_UI_SHORTCUTS` | `false` |
| `AI_UI_PROVIDER_BADGE` | `NEXT_PUBLIC_AI_UI_PROVIDER_BADGE` | `false` |
| `AI_UI_CONTEXT_INDICATORS` | `NEXT_PUBLIC_AI_UI_CONTEXT_INDICATORS` | `false` |
| `AI_UI_MOBILE_HISTORY_SHEET` | `NEXT_PUBLIC_AI_UI_MOBILE_HISTORY_SHEET` | `false` |
| `AI_UI_HISTORY_PAGINATION` | `NEXT_PUBLIC_AI_UI_HISTORY_PAGINATION` | `false` |
| `AI_UI_CONVERSATION_ORG` | `NEXT_PUBLIC_AI_UI_CONVERSATION_ORG` | `false` |

Accepted truthy values: `1`, `true`, `yes`, `on` (case-insensitive).  
Accepted falsy values: `0`, `false`, `no`, `off`, empty, unset.

## Purpose of each flag

| Flag | Purpose | Future wave |
|------|---------|-------------|
| `AI_UI_ENTERPRISE_SHELL` | Decomposed layout shell (Phase 1) | W1 / Phase 1 |
| `AI_UI_STREAM_CONTROLS` | Stop generation + retry controls | W2 |
| `AI_UI_ENHANCED_FEEDBACK` | Toasts, delete confirm, copy feedback | W2 |
| `AI_UI_SKELETONS` | Skeleton loaders instead of spinner-only loading | W2 |
| `AI_UI_SHORTCUTS` | Keyboard shortcuts + a11y live regions | W3 |
| `AI_UI_PROVIDER_BADGE` | Show active AI provider from stream meta | W3 |
| `AI_UI_CONTEXT_INDICATORS` | Read-only workspace/module/memory context chips | W4 |
| `AI_UI_MOBILE_HISTORY_SHEET` | Mobile conversation history sheet/drawer | W3 |
| `AI_UI_HISTORY_PAGINATION` | Load-more / paginated conversation history | W3 |
| `AI_UI_CONVERSATION_ORG` | Rename / archive / pin / restore (UI when APIs exist) | W5 |

### Phase 1 shell wiring

`AI_UI_ENTERPRISE_SHELL` controls layout composition only:

- **OFF (default):** `AiAssistantLegacyLayout` — pre-extraction monolithic JSX path
- **ON:** `AiAssistantEnterpriseShell` — composed presentational components

Orchestration (`AiAssistantPageContent`) and data flow are shared; only the view tree swaps.

### Phase 2 UX wiring

Any Phase 2 flag ON (or enterprise shell ON) uses the modular shell so enhancements can render. All Phase 2 flags still default **OFF**.

| Flag | Phase 2 behavior when ON |
|------|--------------------------|
| `AI_UI_SKELETONS` | Conversation + thread skeletons |
| `AI_UI_ENHANCED_FEEDBACK` | Delete confirm dialog + copy/delete/error toasts |
| `AI_UI_STREAM_CONTROLS` | Stop (AbortController) + Retry failed send |
| `AI_UI_PROVIDER_BADGE` | Provider from SSE `meta.provider` |
| `AI_UI_CONTEXT_INDICATORS` | Read-only mode/session/workspace chips |
| `AI_UI_SHORTCUTS` | Ctrl/Cmd+K/N/L + live region status |
| `AI_UI_MOBILE_HISTORY_SHEET` | History sheet on small screens |
| `AI_UI_HISTORY_PAGINATION` | Load more via existing list `page`/`limit` |

## Usage

```ts
import {
  isAiUiEnterpriseShellEnabled,
  getAiUiFeatureFlags,
  isAiUiFeatureEnabled,
} from "@/features/ai/feature-flags";

// Preferred (tree-shake friendly) — single flag
if (isAiUiEnterpriseShellEnabled()) {
  // Wave W1+ shell only
}

// By id
if (isAiUiFeatureEnabled("AI_UI_STREAM_CONTROLS")) {
  // ...
}

// Snapshot (dev/debug)
const flags = getAiUiFeatureFlags();
```

Wave W0 does **not** wire these into UI. Later waves must gate enhancements behind these helpers so OFF = current production UX.

## Rollout strategy

1. Deploy web with all flags unset/false (no visual change).
2. Enable one flag at a time in staging via env (e.g. Vercel preview).
3. Validate the corresponding wave checklist.
4. Enable in production gradually (one wave/flag cluster at a time).

## Rollback strategy

1. Set the failing `NEXT_PUBLIC_AI_UI_*` variable to `false` (or remove it).
2. Restart / redeploy the web app so Next.js re-inlines public env.
3. Core chat (send, stream, history, delete, mode) returns to pre-enhancement behavior for that flag’s surface.

Instant rollback does not require code revert when enhancements are correctly gated.

---

# AI Documents Feature Flags (Task 1.2)

See [AI_DOCS_FLAGS.md](./AI_DOCS_FLAGS.md) and [AI_DOCS_REGRESSION_CHECKLIST.md](./AI_DOCS_REGRESSION_CHECKLIST.md).

Same pattern as `AI_UI_*`: `NEXT_PUBLIC_AI_DOCS_*`, defaults OFF, exhaustive `isAiDocsFeatureEnabled` switch.

- **Phase 1:** `AI_DOCS_ENTERPRISE_SHELL` (legacy vs modular shell).
- **Phase 2 (Tier A):** deep-link fetch, manual create, live preview, templates, enhanced export, autosave, skeletons, enhanced feedback.
- **Deferred (unwired):** version history, sharing, drafts/approval, comments, regenerate.
