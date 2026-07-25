# ADR-003: Why Tailwind CSS

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application requires a premium enterprise UI with dark/light themes, glassmorphism effects, responsive layouts, consistent spacing, and a professional color palette — as defined in the EliteFlow design reference. The design system must support 20+ modules, hundreds of components, and two theme modes without CSS duplication or specificity wars.

The UI layer uses shadcn/ui components, which are built on Tailwind CSS utility classes and CSS variables for theming.

---

## Problem

We need a styling approach that can:

- Implement a premium dark/light theme system with design tokens
- Ensure visual consistency across 20+ feature modules built by multiple developers
- Support responsive design for desktop, laptop, tablet, and mobile
- Enable rapid UI development without writing custom CSS files per component
- Integrate with shadcn/ui and our enterprise design system
- Avoid CSS specificity conflicts and unused stylesheet bloat
- Allow programmatic access to design tokens (colors, spacing, shadows) in TypeScript

Traditional CSS files, CSS Modules, or CSS-in-JS each introduce trade-offs in theming, bundle size, or developer experience that are problematic at enterprise scale.

---

## Decision

We will use **Tailwind CSS** as the sole styling solution for the frontend application.

Key implementation choices:

- **Tailwind CSS v3+** with `tailwind.config.ts` defining design tokens
- **CSS variables** for theme colors (`--background`, `--foreground`, `--primary`, etc.) enabling dark/light mode switching
- **Design tokens** in `src/styles/theme/` mirrored in Tailwind config for programmatic access
- **Utility-first** approach — styles applied via class names in JSX, not separate CSS files
- **`cn()` utility** (`clsx` + `tailwind-merge`) for conditional and merged class names
- **No custom CSS files** per component — only global styles in `globals.css` for base resets and CSS variable definitions
- **Purge/content configuration** to eliminate unused styles from production bundle

---

## Consequences

### Positive

- **Consistency** — utility classes enforce the design system; developers cannot invent arbitrary spacing or colors
- **Theme support** — CSS variables + Tailwind `dark:` variant enables seamless dark/light mode
- **No specificity wars** — utility classes have equal specificity; order is predictable
- **Small production bundle** — PurgeCSS removes unused classes; typically 10–15 KB gzipped
- **shadcn/ui compatibility** — shadcn components are built with Tailwind; zero friction
- **Rapid development** — no context switching between JSX and CSS files
- **Responsive by default** — `sm:`, `md:`, `lg:`, `xl:` prefixes for breakpoint-specific styles

### Negative

- **Verbose JSX** — complex components can have long className strings
- **Learning curve** — developers must memorize utility class names
- **Abstraction limit** — highly custom animations or layouts may still need raw CSS
- **HTML readability** — class-heavy JSX can be harder to scan than semantic CSS class names

### Neutral

- `cn()` utility and component extraction mitigate verbose class strings
- Tailwind IntelliSense VS Code extension provides autocompletion

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **CSS Modules** | No utility-first workflow; theming requires duplicate CSS files per theme; slower development |
| **Styled Components** | Runtime CSS-in-JS adds bundle size and performance overhead; poor RSC compatibility in Next.js App Router |
| **Emotion** | Same runtime overhead as Styled Components; conflicts with Server Components |
| **Sass/SCSS** | No utility-first approach; theming requires manual variable management; larger CSS output |
| **Vanilla CSS + BEM** | High maintenance at 20+ modules; no built-in design token system; specificity issues at scale |
| **UnoCSS** | Smaller ecosystem; less shadcn/ui compatibility; team unfamiliarity |

---

## Why This Decision Is Best

Tailwind CSS is the optimal styling solution because it is the **foundation of shadcn/ui** — our chosen component library. Adopting a different styling approach would require rewriting every shadcn component or maintaining incompatible styling layers.

For an enterprise application with premium dark/light themes, Tailwind's CSS variable theming and `dark:` variant provide the cleanest path to the EliteFlow design reference. Design tokens defined once in `tailwind.config.ts` propagate to every component automatically.

Utility-first CSS eliminates the "which CSS file do I edit?" question across 20+ modules. Every developer uses the same spacing scale, color palette, and typography — enforcing visual consistency by default, not by code review.
