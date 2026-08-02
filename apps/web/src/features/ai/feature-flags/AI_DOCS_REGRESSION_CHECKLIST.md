# AI Documents — Regression Checklist (Phase 1 + Phase 2)

## Baseline (all `AI_DOCS_*` OFF)

| # | Scenario | Pass |
|---|----------|------|
| 1 | Document list loads | ☐ |
| 2 | Search filters results | ☐ |
| 3 | Type filter works | ☐ |
| 4 | Pagination previous/next | ☐ |
| 5 | Generate create dialog | ☐ |
| 6 | View sheet + MarkdownView | ☐ |
| 7 | Edit + Save | ☐ |
| 8 | Delete confirm + soft delete | ☐ |
| 9 | Copy content | ☐ |
| 10 | Export `.md` (legacy filename) | ☐ |
| 11 | Deep-link opens only if doc is on current list page | ☐ |
| 12 | Desktop + mobile usable | ☐ |
| 13 | Route `/ai-documents` unchanged | ☐ |

## Phase 2 — individual flags

| Flag | Scenario | Pass |
|------|----------|------|
| `DEEP_LINK_FETCH` | `?id=` opens viewer via `useAiDocument` even if not on page | ☐ |
| `CREATE_MANUAL` | Write manually → POST with `generate=false` + content | ☐ |
| `CREATE_MANUAL` | Generate with AI still works | ☐ |
| `LIVE_PREVIEW` | Editor shows markdown preview pane | ☐ |
| `TEMPLATE_PRESETS` | Template chips prefill type/title/prompt/(content) | ☐ |
| `EXPORT_ENHANCED` | Filename includes type + date; Print works | ☐ |
| `EXPORT_ENHANCED` | Markdown download still works | ☐ |
| `AUTOSAVE` | Edits debounce-save (~1.5s); status updates; manual Save works | ☐ |
| `AUTOSAVE` OFF | Manual-save only restored | ☐ |
| `SKELETONS` | List shows skeleton cards while loading | ☐ |
| `ENHANCED_FEEDBACK` | Toasts for copy / export / delete / save | ☐ |

## All Phase 2 flags ON

| # | Scenario | Pass |
|---|----------|------|
| A | Combined UX works without API/schema changes | ☐ |
| B | Permissions still `ai:use` | ☐ |
| C | Notifications / communication links unaffected | ☐ |

## Rollback

| # | Check | Pass |
|---|-------|------|
| R1 | Unset all `NEXT_PUBLIC_AI_DOCS_*` + restart → Phase 1 OFF behavior | ☐ |
| R2 | Single flag OFF rolls back only that enhancement | ☐ |
