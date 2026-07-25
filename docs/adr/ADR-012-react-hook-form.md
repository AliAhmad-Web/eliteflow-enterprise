# ADR-012: Why React Hook Form

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application contains dozens of forms across all modules: login, signup, client creation, project setup, task assignment, invoice generation, team management, settings, and AI assistant input. Forms vary in complexity from simple login (2 fields) to complex invoice creation (line items, taxes, discounts, client selection).

Every form must validate input, display field-level errors, handle submission states, and integrate with our Zod validation schemas shared between frontend and backend.

---

## Problem

We need a form management library that can:

- Handle forms ranging from 2 fields to 20+ fields with nested arrays (invoice line items)
- Integrate with Zod schemas for validation (shared with backend via `packages/shared`)
- Minimize re-renders — typing in one field should not re-render the entire form
- Provide field-level error messages aligned with our UI design system
- Support controlled and uncontrolled input modes
- Handle complex form state: default values, dirty tracking, reset, watch
- Work with shadcn/ui form components (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`)
- Maintain small bundle size across 20+ form-heavy modules

Building forms with raw `useState` per field leads to hundreds of lines of state management, manual validation, and re-render performance issues. Formik is heavier and re-renders more aggressively.

---

## Decision

We will use **React Hook Form** with **Zod resolver** (`@hookform/resolvers/zod`) for all form management.

Key implementation choices:

- **Zod schemas** from `features/*/schemas/` or `packages/shared/schemas/` as the validation source
- **`zodResolver`** connects Zod schemas to React Hook Form automatically
- **shadcn/ui Form components** — `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` built on React Hook Form
- **Reusable form components** in `components/common/forms/` — `FormField`, `FormSelect`, `FormDatePicker`, `FormFileUpload`
- **Feature forms** in `features/*/components/` — `client-form.tsx`, `invoice-form.tsx`, etc.
- **Uncontrolled by default** — React Hook Form uses refs, not state, for field values (fewer re-renders)

### Pattern:

```typescript
// features/clients/components/client-form.tsx
const form = useForm<ClientFormValues>({
  resolver: zodResolver(clientSchema),
  defaultValues: { name: '', email: '' },
});

const onSubmit = (data: ClientFormValues) => {
  createClient.mutate(data);  // TanStack Query mutation
};
```

---

## Consequences

### Positive

- **Performance** — uncontrolled inputs via refs; no re-render on every keystroke
- **Zod integration** — same schema validates on frontend and backend; single source of truth
- **shadcn/ui compatibility** — Form components designed specifically for React Hook Form
- **Small bundle** — ~9 KB gzipped
- **Field-level errors** — `form.formState.errors.email` maps directly to UI error messages
- **Complex forms** — `useFieldArray` for dynamic lists (invoice line items, task checklists)
- **Dirty tracking** — `form.formState.isDirty` for unsaved changes warnings

### Negative

- **Uncontrolled paradigm** — different mental model from controlled `useState` inputs; learning curve
- **Ref-based** — some third-party components may not forward refs correctly
- **DevTools** — no built-in visual debugger (unlike Redux DevTools)

### Neutral

- Form state is local to the form component — not stored in Zustand or TanStack Query
- Validation schemas live in `features/*/schemas/` and are shared with backend via `packages/shared`

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Formik** | Re-renders entire form on every keystroke; larger bundle (~15 KB); less active development |
| **Raw useState per field** | Unmaintainable at 20+ fields; no validation integration; manual error handling |
| **React Final Form** | Smaller community; no Zod resolver; less shadcn/ui integration |
| **TanStack Form** | Newer, less mature; smaller ecosystem; shadcn/ui not built for it yet |
| **Custom form hook** | Reinventing the wheel; maintenance burden; no community support |

---

## Why This Decision Is Best

React Hook Form is the performance leader for React form management and is the **official form library for shadcn/ui**. Every shadcn Form component (`FormField`, `FormItem`, `FormMessage`) is built on React Hook Form's API.

For an enterprise application with forms in every module — client creation, project setup, invoice generation with line items, team management, settings — the uncontrolled input model means users experience zero lag when typing in complex forms. Combined with Zod validation (ADR-013), the same schema that validates on the backend validates on the frontend, ensuring consistent error messages and type safety from form input to database row.

The `@hookform/resolvers/zod` integration means we write the validation schema once and get both TypeScript types and runtime validation for free.
