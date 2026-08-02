# AI Documents Feature Flags (Task 1.2)

Env-based flags for EliteFlow `/ai-documents` upgrades.

- **No third-party service**
- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart web

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `AI_DOCS_ENTERPRISE_SHELL` | `NEXT_PUBLIC_AI_DOCS_ENTERPRISE_SHELL` | `false` | 1 |
| `AI_DOCS_SKELETONS` | `NEXT_PUBLIC_AI_DOCS_SKELETONS` | `false` | 2 |
| `AI_DOCS_ENHANCED_FEEDBACK` | `NEXT_PUBLIC_AI_DOCS_ENHANCED_FEEDBACK` | `false` | 2 |
| `AI_DOCS_LIVE_PREVIEW` | `NEXT_PUBLIC_AI_DOCS_LIVE_PREVIEW` | `false` | 2 |
| `AI_DOCS_AUTOSAVE` | `NEXT_PUBLIC_AI_DOCS_AUTOSAVE` | `false` | 2 |
| `AI_DOCS_TEMPLATE_PRESETS` | `NEXT_PUBLIC_AI_DOCS_TEMPLATE_PRESETS` | `false` | 2 |
| `AI_DOCS_DEEP_LINK_FETCH` | `NEXT_PUBLIC_AI_DOCS_DEEP_LINK_FETCH` | `false` | 2 |
| `AI_DOCS_EXPORT_ENHANCED` | `NEXT_PUBLIC_AI_DOCS_EXPORT_ENHANCED` | `false` | 2 |
| `AI_DOCS_CREATE_MANUAL` | `NEXT_PUBLIC_AI_DOCS_CREATE_MANUAL` | `false` | 2 |
| `AI_DOCS_VERSION_HISTORY` | `NEXT_PUBLIC_AI_DOCS_VERSION_HISTORY` | `false` | deferred |
| `AI_DOCS_SHARING` | `NEXT_PUBLIC_AI_DOCS_SHARING` | `false` | deferred |
| `AI_DOCS_DRAFTS_APPROVAL` | `NEXT_PUBLIC_AI_DOCS_DRAFTS_APPROVAL` | `false` | deferred |
| `AI_DOCS_COMMENTS` | `NEXT_PUBLIC_AI_DOCS_COMMENTS` | `false` | deferred |
| `AI_DOCS_REGENERATE` | `NEXT_PUBLIC_AI_DOCS_REGENERATE` | `false` | deferred |

## Phase 1 wiring

`AI_DOCS_ENTERPRISE_SHELL`:

- **OFF (default):** `AiDocumentsLegacyLayout`
- **ON:** `AiDocumentsEnterpriseShell`

## Phase 2 wiring (Tier A)

Any Phase 2 flag ON (or enterprise shell ON) uses the modular shell so enhancements can render.

| Flag | Behavior when ON |
|------|------------------|
| `AI_DOCS_DEEP_LINK_FETCH` | Resolve `?id=` / `?open=` via `useAiDocument(id)` |
| `AI_DOCS_CREATE_MANUAL` | Create dialog mode: Generate vs Write manually (`generate=false`) |
| `AI_DOCS_LIVE_PREVIEW` | Editor split: textarea + `MarkdownView` preview |
| `AI_DOCS_TEMPLATE_PRESETS` | Client templates (mobile-parity) prefill prompt/content |
| `AI_DOCS_EXPORT_ENHANCED` | Better `.md` filenames + Print |
| `AI_DOCS_AUTOSAVE` | Debounced PATCH (~1.5s), changed fields only, save status |
| `AI_DOCS_SKELETONS` | List skeleton loaders |
| `AI_DOCS_ENHANCED_FEEDBACK` | Copy / export / delete / save toasts |

Deferred flags remain declared and unwired.

## Usage

```ts
import {
  isAiDocsEnterpriseShellEnabled,
  isAiDocsLivePreviewEnabled,
  getAiDocsFeatureFlags,
} from "@/features/ai/feature-flags";
```

## Regression

See [AI_DOCS_REGRESSION_CHECKLIST.md](./AI_DOCS_REGRESSION_CHECKLIST.md).
