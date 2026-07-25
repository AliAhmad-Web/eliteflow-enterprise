# Enterprise Design System — Complete Specification

> **Project:** Enterprise Business Management Web Application  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** 2026-07-22  
> **Default Theme:** Dark  
> **Design Language:** Premium Enterprise (Linear · Notion · Stripe · Vercel · EliteFlow)

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Design Tokens](#2-design-tokens)
3. [Color System](#3-color-system)
4. [Dark Theme](#4-dark-theme)
5. [Light Theme](#5-light-theme)
6. [Grid System](#6-grid-system)
7. [Spacing System](#7-spacing-system)
8. [Elevation System](#8-elevation-system)
9. [Icon System](#9-icon-system)
10. [Motion Principles](#10-motion-principles)
11. [Accessibility Rules](#11-accessibility-rules)
12. [Responsive Rules](#12-responsive-rules)
13. [Component Design Rules](#13-component-design-rules)
14. [UI Consistency Rules](#14-ui-consistency-rules)
15. [Enterprise Design Rules](#15-enterprise-design-rules)

---

## 1. Design Principles

These seven principles govern every design decision in the application. When two options conflict, resolve in the order listed below.

---

### 1.1 Minimal

**Definition:** Remove everything that does not serve the user's task. Every pixel must earn its place.

**Rules:**
- One primary action per screen section
- No decorative elements without functional purpose
- Data density over decoration — show what matters, hide what doesn't
- White space is a design element, not empty space
- Navigation limited to essential modules only

**Why this exists:** Enterprise users work in this application for hours daily. Visual noise causes fatigue, slows decision-making, and reduces trust. Products like Linear succeed because they remove friction, not because they add ornament. A cluttered dashboard signals an immature product.

**Anti-patterns:**
- Multiple competing call-to-action buttons on one card
- Decorative gradients behind data tables
- Icon-only buttons without tooltips
- Redundant labels ("Submit Button" instead of "Submit")

---

### 1.2 Premium

**Definition:** The interface must feel high-quality, intentional, and worth paying for.

**Rules:**
- Subtle depth through elevation and soft shadows — never flat, never over-3D
- Refined typography with careful weight and spacing hierarchy
- Smooth, purposeful transitions — never jarring or instant
- Glassmorphism on elevated surfaces (cards, modals, dropdowns) in dark theme
- Gold accent reserved exclusively for branding (logo, crown icon, upgrade prompts)
- Purple accent for interactive elements (buttons, active states, focus rings)

**Why this exists:** Our users are business owners and enterprise administrators evaluating whether this platform is professional enough to manage their clients, invoices, and teams. Premium visual quality directly influences perceived product value and customer retention.

**Anti-patterns:**
- Default system fonts (Arial, Times New Roman)
- Harsh pure black (`#000000`) backgrounds
- Neon or oversaturated accent colors
- Stock illustration overload

---

### 1.3 Modern

**Definition:** Contemporary visual language that feels current in 2026, not dated.

**Rules:**
- Rounded corners on all containers (12–16px radius)
- Soft, diffused shadows — not hard drop shadows
- Subtle border treatments (1px, low-opacity) instead of heavy outlines
- Modern sans-serif typography (Inter or equivalent)
- Card-based layouts with clear content grouping
- Status communicated through color-coded badges, not text alone

**Why this exists:** Enterprise software has a reputation for outdated UIs. A modern interface signals that the product is actively maintained, secure, and built with current best practices. It also attracts talent and reduces onboarding friction for users familiar with modern SaaS tools.

---

### 1.4 Professional

**Definition:** Suitable for boardroom presentations, client-facing portals, and daily operational use.

**Rules:**
- Neutral tone in copy and visual language — no playful or casual styling
- Consistent data presentation (tables, charts, metrics) across all modules
- Clear hierarchy: primary data → secondary context → tertiary metadata
- Financial figures always formatted with currency symbols and decimal precision
- Dates and times in consistent, locale-aware formats
- No emoji in UI labels (emoji acceptable only in user-generated content or welcome messages)

**Why this exists:** An Admin may screen-share the dashboard in a client meeting. An Employee may show project status to a stakeholder. The interface must not embarrass the user or undermine credibility. Professional design is a feature, not a constraint.

---

### 1.5 Enterprise

**Definition:** Built for scale — 20+ modules, four role-based dashboards, years of feature growth.

**Rules:**
- Every UI pattern is defined once and reused everywhere
- Design tokens are the single source of truth — no hardcoded values in components
- All four dashboards share the same component library and tokens
- Role-specific differences are content and permissions, not visual language
- System must support future modules without redesigning existing screens
- Data-heavy views (tables with 50+ rows, complex charts) must remain usable

**Why this exists:** Without enterprise discipline, each new module introduces visual drift. After 20 modules built by different developers, the product looks like 20 different applications stitched together. Enterprise rules prevent this decay.

---

### 1.6 Accessibility

**Definition:** Usable by everyone, including users with visual, motor, and cognitive disabilities.

**Rules:**
- WCAG 2.1 Level AA compliance minimum
- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- All interactive elements keyboard-accessible
- Focus states visible on every focusable element
- Status never communicated by color alone — always paired with text or icon
- Touch targets minimum 44×44px on mobile
- Screen reader labels on all icon-only controls

**Why this exists:** Accessibility is a legal requirement in many jurisdictions, an ethical obligation, and a quality indicator. Accessible design also improves usability for all users — high contrast helps in bright offices, keyboard navigation helps power users.

---

### 1.7 Consistency

**Definition:** The same thing looks and behaves the same way everywhere.

**Rules:**
- One button style, one card style, one table style — used across all modules
- Same spacing, same border radius, same shadow depth for equivalent elements
- Same loading, empty, error, and success states in every data view
- Same navigation patterns across all four dashboards
- Same form field styling in login, client creation, and invoice generation
- Deviations require Design System update, not local overrides

**Why this exists:** Consistency reduces cognitive load. When a user learns how the Clients table works, they instantly know how the Projects table works. Inconsistency forces users to re-learn patterns on every screen, increasing errors and support requests.

---

## 2. Design Tokens

Design tokens are the atomic values of the design system. Every visual property in the application references a token — never a raw value. Tokens enable theme switching, global updates, and cross-team consistency.

**Why tokens exist:** Without tokens, changing the primary color requires finding and updating hundreds of hardcoded values across 20+ modules. With tokens, one change propagates everywhere. Tokens are the bridge between design and engineering.

### 2.1 Token Naming Convention

```
--{category}-{property}-{variant}-{state}

Examples:
--color-primary-default
--color-primary-hover
--color-surface-elevated
--spacing-4
--radius-lg
--shadow-md
--font-size-sm
--z-index-modal
```

### 2.2 Colors

See [Section 3: Color System](#3-color-system) and theme-specific tokens in [Section 4](#4-dark-theme) and [Section 5](#5-light-theme).

### 2.3 Typography

#### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family-sans` | `Inter, system-ui, -apple-system, sans-serif` | All UI text |
| `--font-family-mono` | `JetBrains Mono, Fira Code, monospace` | Code, IDs, API keys, invoice numbers |

**Why Inter:** Industry standard for enterprise dashboards. Excellent readability at small sizes, full weight range (300–700), optimized for screens. Used by Linear, Vercel, GitHub, and Stripe.

#### Font Sizes

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `--font-size-xs` | 11px / 0.6875rem | 16px | Badges, timestamps, metadata |
| `--font-size-sm` | 13px / 0.8125rem | 20px | Table cells, secondary labels, captions |
| `--font-size-base` | 14px / 0.875rem | 22px | Body text, form inputs, buttons |
| `--font-size-md` | 15px / 0.9375rem | 24px | Sidebar nav items, card titles |
| `--font-size-lg` | 18px / 1.125rem | 28px | Section headings, page subtitles |
| `--font-size-xl` | 22px / 1.375rem | 30px | Page titles, welcome messages |
| `--font-size-2xl` | 28px / 1.75rem | 36px | Dashboard greeting, hero metrics |
| `--font-size-3xl` | 36px / 2.25rem | 44px | Large metric values (revenue, totals) |
| `--font-size-4xl` | 48px / 3rem | 56px | Marketing/empty state headings only |

**Why this scale:** Based on a subtle modular scale (1.125–1.25 ratio). Small enough for data-dense tables, large enough for clear hierarchy. The 14px base matches Stripe and Linear — proven for all-day enterprise use.

#### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-regular` | 400 | Body text, descriptions, table data |
| `--font-weight-medium` | 500 | Labels, nav items, button text, table headers |
| `--font-weight-semibold` | 600 | Card titles, section headings, metric labels |
| `--font-weight-bold` | 700 | Page titles, large metric values, brand text |

**Why only four weights:** More weights create inconsistency. Four weights provide sufficient hierarchy without decision fatigue. Bold (700) is reserved for emphasis — overuse diminishes impact.

#### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--line-height-tight` | 1.2 | Large headings, metric values |
| `--line-height-snug` | 1.35 | Card titles, section headings |
| `--line-height-normal` | 1.5 | Body text, form labels |
| `--line-height-relaxed` | 1.65 | Long-form descriptions, help text |

**Why:** Tight line heights for display text prevent awkward gaps. Relaxed line heights for paragraphs improve readability. Mismatched line heights are a common source of visual misalignment in enterprise UIs.

#### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--letter-spacing-tight` | -0.02em | Headings xl and above |
| `--letter-spacing-normal` | 0em | Body text, labels |
| `--letter-spacing-wide` | 0.04em | Uppercase labels, badges, table headers |
| `--letter-spacing-wider` | 0.08em | All-caps section dividers only |

**Why:** Slight negative tracking on large headings creates a refined, premium feel. Wide tracking on uppercase text improves legibility at small sizes.

### 2.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | 0px | Tables, full-bleed elements |
| `--radius-sm` | 6px | Badges, tags, small chips |
| `--radius-md` | 8px | Buttons, inputs, dropdown items |
| `--radius-lg` | 12px | Cards, modals, panels |
| `--radius-xl` | 16px | Large cards, feature sections, dialogs |
| `--radius-2xl` | 20px | Sidebar upgrade card, hero containers |
| `--radius-full` | 9999px | Avatars, circular buttons, pills |

**Why:** Consistent radius creates visual harmony. Cards at 12px and buttons at 8px feel related but distinct. Using `radius-full` only for truly circular elements prevents accidental pill-shaped cards.

### 2.5 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-none` | none | Flat elements, inline items |
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift — inputs, buttons |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards at rest |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals, drawers |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15), 0 8px 10px rgba(0,0,0,0.06)` | Command palette, elevated overlays |
| `--shadow-glow-primary` | `0 0 20px rgba(139,92,246,0.15)` | Active nav item, primary button hover (dark theme) |
| `--shadow-glow-success` | `0 0 12px rgba(34,197,94,0.12)` | Positive metric indicators |
| `--shadow-inner` | `inset 0 2px 4px rgba(0,0,0,0.06)` | Pressed buttons, inset inputs |

**Why:** Shadows create depth hierarchy without borders. In dark theme, shadows are subtler (lower opacity) to avoid a muddy appearance. Glow shadows on primary elements reinforce the premium purple accent without being garish.

### 2.6 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-0` | 0px | Reset |
| `--spacing-0.5` | 2px | Hairline gaps |
| `--spacing-1` | 4px | Icon-to-text gap, tight padding |
| `--spacing-1.5` | 6px | Badge padding |
| `--spacing-2` | 8px | Compact element padding |
| `--spacing-2.5` | 10px | Button vertical padding |
| `--spacing-3` | 12px | Input padding, small card padding |
| `--spacing-4` | 16px | Standard card padding, form field gap |
| `--spacing-5` | 20px | Section inner padding |
| `--spacing-6` | 24px | Card padding (comfortable), grid gap |
| `--spacing-8` | 32px | Section gap, page padding (mobile) |
| `--spacing-10` | 40px | Large section gap |
| `--spacing-12` | 48px | Page section separation |
| `--spacing-16` | 64px | Page top padding (desktop) |
| `--spacing-20` | 80px | Hero section spacing |
| `--spacing-24` | 96px | Marketing page sections only |

**Why 4px base:** Industry standard (used by Tailwind, Material, Atlassian). Divisible by 2 for fine adjustments. Large enough for clear visual rhythm, small enough for precise control.

### 2.7 Container Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--container-xs` | 480px | Modals (small), confirmation dialogs |
| `--container-sm` | 640px | Modals (medium), auth forms |
| `--container-md` | 768px | Modals (large), settings panels |
| `--container-lg` | 1024px | Content area max-width (tablet) |
| `--container-xl` | 1280px | Main content area (laptop) |
| `--container-2xl` | 1440px | Main content area (desktop) |
| `--container-full` | 100% | Full-bleed layouts |

**Why:** Constraining content width on ultra-wide monitors prevents unreadable line lengths and maintains visual focus. Dashboard content should not stretch edge-to-edge on a 4K display.

### 2.8 Z-Index

| Token | Value | Usage |
|-------|-------|-------|
| `--z-index-base` | 0 | Default content |
| `--z-index-raised` | 10 | Sticky table headers, elevated cards |
| `--z-index-dropdown` | 20 | Dropdown menus, select options |
| `--z-index-sticky` | 30 | Sticky sidebar, sticky page header |
| `--z-index-overlay` | 40 | Modal backdrop, drawer backdrop |
| `--z-index-modal` | 50 | Modals, dialogs |
| `--z-index-popover` | 60 | Popovers, tooltips on modals |
| `--z-index-toast` | 70 | Toast notifications |
| `--z-index-command` | 80 | Command palette (⌘K) |
| `--z-index-max` | 9999 | Critical overlays only — use sparingly |

**Why:** Without a defined z-index scale, developers use arbitrary values (`z-index: 99999`) causing stacking conflicts. A token scale ensures predictable layering across all modules.

### 2.9 Breakpoints

| Token | Value | Target Device |
|-------|-------|---------------|
| `--breakpoint-xs` | 0px | Small mobile |
| `--breakpoint-sm` | 640px | Large mobile |
| `--breakpoint-md` | 768px | Tablet (portrait) |
| `--breakpoint-lg` | 1024px | Tablet (landscape) / small laptop |
| `--breakpoint-xl` | 1280px | Laptop / desktop |
| `--breakpoint-2xl` | 1536px | Large desktop / ultra-wide |

**Why:** Mobile-first breakpoints ensure the application works on every device. Enterprise users access dashboards from phones (checking metrics), tablets (meetings), and desktops (daily work).

### 2.10 Opacity

| Token | Value | Usage |
|-------|-------|-------|
| `--opacity-0` | 0 | Hidden |
| `--opacity-5` | 0.05 | Subtle background tints |
| `--opacity-10` | 0.10 | Hover backgrounds, badge backgrounds |
| `--opacity-20` | 0.20 | Disabled backgrounds, border tints |
| `--opacity-40` | 0.40 | Placeholder text, muted icons |
| `--opacity-60` | 0.60 | Secondary text, metadata |
| `--opacity-80` | 0.80 | Semi-transparent overlays |
| `--opacity-100` | 1.00 | Full opacity — default |

**Why:** Opacity tokens prevent arbitrary `opacity: 0.37` values. Consistent opacity levels create predictable visual hierarchy for text, backgrounds, and overlays.

### 2.11 Border Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--border-width-none` | 0px | Borderless cards (shadow-only elevation) |
| `--border-width-thin` | 1px | Default borders — cards, inputs, dividers |
| `--border-width-medium` | 2px | Focus rings, active states, selected items |
| `--border-width-thick` | 3px | Active sidebar indicator, strong emphasis |

**Why:** 1px borders are the enterprise standard for subtle separation. 2px for focus states meets WCAG visibility requirements. Thicker borders are reserved for navigation indicators to avoid visual heaviness.

---

## 3. Color System

The color system is organized into semantic categories. Components reference semantic tokens (e.g., `--color-text-primary`), never raw hex values. Semantic naming ensures colors adapt correctly when switching between dark and light themes.

**Why semantic colors:** A button uses `--color-primary-default`, not `#8B5CF6`. When the theme changes, the token value changes but the reference stays the same. This is the foundation of theme switching.

### 3.1 Brand Colors

| Role | Name | Dark Theme | Light Theme | Usage |
|------|------|-----------|-------------|-------|
| Primary | Purple | `#8B5CF6` | `#7C3AED` | Buttons, active states, links, focus rings |
| Primary Hover | Purple Dark | `#7C3AED` | `#6D28D9` | Button hover, interactive hover |
| Primary Subtle | Purple Tint | `rgba(139,92,246,0.10)` | `rgba(124,58,237,0.08)` | Active nav background, selected row |
| Secondary | Slate | `#64748B` | `#94A3B8` | Secondary buttons, muted actions |
| Accent (Brand) | Gold | `#F59E0B` | `#D97706` | Logo crown, upgrade prompts, premium badges |
| Accent Subtle | Gold Tint | `rgba(245,158,11,0.10)` | `rgba(217,119,6,0.08)` | Upgrade card background |

**Why purple + gold:** Purple conveys innovation and premium quality (used by Stripe, Linear). Gold reserved for branding creates a luxury association without overuse. The combination distinguishes our product from generic blue enterprise tools.

### 3.2 Semantic Status Colors

| Status | Name | Default | Subtle Background | Text on Subtle | Usage |
|--------|------|---------|-------------------|----------------|-------|
| Success | Green | `#22C55E` | `rgba(34,197,94,0.10)` | `#16A34A` | Paid, completed, active, positive trends |
| Warning | Amber | `#F59E0B` | `rgba(245,158,11,0.10)` | `#D97706` | Pending, medium priority, approaching deadline |
| Error | Red | `#EF4444` | `rgba(239,68,68,0.10)` | `#DC2626` | Overdue, failed, high priority, negative trends |
| Info | Blue | `#3B82F6` | `rgba(59,130,246,0.10)` | `#2563EB` | Informational, new features, neutral alerts |

**Why semantic status colors:** Users scan dashboards for problems (red) and successes (green) in milliseconds. Consistent status colors across invoices, tasks, projects, and notifications create instant comprehension without reading text.

### 3.3 Background Colors

| Token | Purpose |
|-------|---------|
| `--color-bg-base` | Page background — the deepest layer |
| `--color-bg-subtle` | Slightly elevated areas within the page |
| `--color-bg-muted` | Input backgrounds, code blocks, secondary areas |
| `--color-bg-emphasis` | Hover state on rows, highlighted sections |

**Why layered backgrounds:** Depth is created through subtle background shifts, not borders. Three background levels (base → subtle → muted) provide enough hierarchy for any layout without visual noise.

### 3.4 Surface Colors

| Token | Purpose |
|-------|---------|
| `--color-surface-default` | Cards, panels, sidebar |
| `--color-surface-elevated` | Modals, dropdowns, popovers, tooltips |
| `--color-surface-overlay` | Modal backdrop, drawer backdrop |
| `--color-surface-glass` | Glassmorphism surfaces (dark theme) — semi-transparent with blur |

**Why surfaces vs backgrounds:** Backgrounds are the canvas. Surfaces are objects placed on the canvas. Separating them allows cards to float above the page background with clear visual distinction.

### 3.5 Border Colors

| Token | Purpose |
|-------|---------|
| `--color-border-default` | Card borders, input borders, dividers |
| `--color-border-subtle` | Hairline separators, table row dividers |
| `--color-border-strong` | Emphasized borders, active input borders |
| `--color-border-focus` | Focus ring color (matches primary) |

**Why subtle borders:** In premium dark UIs, borders should be barely visible — just enough to define edges. Heavy borders make the interface feel boxed-in and dated.

### 3.6 Text Colors

| Token | Purpose |
|-------|---------|
| `--color-text-primary` | Headings, primary content, metric values |
| `--color-text-secondary` | Descriptions, labels, table secondary columns |
| `--color-text-tertiary` | Timestamps, metadata, placeholders |
| `--color-text-disabled` | Disabled buttons, inactive elements |
| `--color-text-inverse` | Text on primary-colored backgrounds |
| `--color-text-link` | Clickable text links |
| `--color-text-link-hover` | Link hover state |

**Why three text levels:** Primary, secondary, and tertiary text create hierarchy without relying on font size alone. This is critical in data-dense tables where size variation would reduce scanability.

### 3.7 Sidebar Colors

| Token | Purpose |
|-------|---------|
| `--color-sidebar-bg` | Sidebar background |
| `--color-sidebar-border` | Right border separating sidebar from content |
| `--color-sidebar-item-default` | Inactive nav item text and icon |
| `--color-sidebar-item-hover` | Nav item hover background and text |
| `--color-sidebar-item-active` | Active nav item background, text, and icon |
| `--color-sidebar-item-active-indicator` | Left border accent on active item |
| `--color-sidebar-section-label` | Section group labels (e.g., "MANAGEMENT") |

**Why dedicated sidebar tokens:** The sidebar is the primary navigation element visible on every screen. Dedicated tokens ensure it remains visually distinct and consistent across all four dashboards without coupling sidebar styles to generic surface tokens.

### 3.8 Navbar Colors

| Token | Purpose |
|-------|---------|
| `--color-navbar-bg` | Top header background |
| `--color-navbar-border` | Bottom border separating header from content |
| `--color-navbar-search-bg` | Search input background |
| `--color-navbar-search-border` | Search input border |
| `--color-navbar-search-placeholder` | Search placeholder text |
| `--color-navbar-icon-default` | Notification, theme toggle icons |
| `--color-navbar-icon-hover` | Icon hover state |

**Why:** The navbar is a persistent, high-visibility element. Dedicated tokens allow the header to have a distinct treatment (e.g., glassmorphism in dark theme) independent of page content.

### 3.9 Card Colors

| Token | Purpose |
|-------|---------|
| `--color-card-bg` | Card background |
| `--color-card-border` | Card border |
| `--color-card-header-bg` | Card header background (if distinct) |
| `--color-card-hover` | Card hover state (interactive cards) |
| `--color-card-stat-icon-bg` | Metric card icon background circle |
| `--color-card-stat-trend-up` | Positive trend text and icon |
| `--color-card-stat-trend-down` | Negative trend text and icon |

**Why:** Cards are the most used container in the dashboard. Dedicated tokens ensure stat cards, list cards, and chart cards all share the same foundation while allowing stat-specific accents.

### 3.10 Chart Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-chart-1` | `#8B5CF6` | Primary data series (revenue, main metric) |
| `--color-chart-2` | `#3B82F6` | Secondary data series (clients, comparison) |
| `--color-chart-3` | `#22C55E` | Positive/completed data |
| `--color-chart-4` | `#F59E0B` | Warning/pending data |
| `--color-chart-5` | `#EF4444` | Negative/overdue data |
| `--color-chart-6` | `#64748B` | Neutral/not-started data |
| `--color-chart-grid` | theme-specific | Chart grid lines |
| `--color-chart-axis` | theme-specific | Axis labels and lines |
| `--color-chart-tooltip-bg` | theme-specific | Tooltip background |
| `--color-chart-gradient-start` | `rgba(139,92,246,0.30)` | Area chart gradient top |
| `--color-chart-gradient-end` | `rgba(139,92,246,0.00)` | Area chart gradient bottom |

**Why six chart colors:** Sufficient for donut charts (project status), bar charts (comparisons), and line charts (trends) without visual confusion. Colors match semantic status colors for instant comprehension.

### 3.11 Interactive State Colors

| State | Token Pattern | Purpose |
|-------|--------------|---------|
| Hover | `--color-{role}-hover` | Mouse hover feedback |
| Active/Pressed | `--color-{role}-active` | Click/tap pressed state |
| Focus | `--color-focus-ring` | Keyboard focus ring |
| Disabled | `--color-{role}-disabled` | Non-interactive state |
| Selected | `--color-{role}-selected` | Selected item in lists, tabs |

**Why explicit state tokens:** Every interactive element must provide visual feedback for all five states. Missing states (especially focus and disabled) are the most common accessibility failures in enterprise UIs.

---

## 4. Dark Theme

Dark theme is the **default theme** for the application. It aligns with the EliteFlow design reference and is preferred by enterprise users for extended daily use (reduced eye strain, premium feel).

**Why dark default:** Enterprise dashboard users spend 6–8 hours daily in the application. Dark themes reduce eye strain in low-light environments, make colored data visualizations pop, and convey a modern, premium aesthetic. Users expect dark mode as default in 2026 SaaS products.

### 4.1 Dark Theme — Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-base` | `#09090B` | Page background |
| `--color-bg-subtle` | `#0F0F12` | Subtle background areas |
| `--color-bg-muted` | `#18181B` | Input backgrounds, code blocks |
| `--color-bg-emphasis` | `#1F1F23` | Row hover, highlighted sections |

### 4.2 Dark Theme — Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--color-surface-default` | `#111114` | Cards, panels |
| `--color-surface-elevated` | `#1A1A1F` | Modals, dropdowns, popovers |
| `--color-surface-overlay` | `rgba(0,0,0,0.60)` | Modal/drawer backdrop |
| `--color-surface-glass` | `rgba(17,17,20,0.80)` | Glassmorphism — sidebar, navbar, cards |

**Why glassmorphism in dark theme:** Semi-transparent surfaces with backdrop blur create depth and premium feel without heavy borders. This is the signature visual treatment of the EliteFlow reference. Glass surfaces work best on dark backgrounds where blur effects are visible.

### 4.3 Dark Theme — Borders

| Token | Value |
|-------|-------|
| `--color-border-default` | `rgba(255,255,255,0.08)` |
| `--color-border-subtle` | `rgba(255,255,255,0.04)` |
| `--color-border-strong` | `rgba(255,255,255,0.14)` |
| `--color-border-focus` | `#8B5CF6` |

### 4.4 Dark Theme — Text

| Token | Value | Contrast on `#09090B` |
|-------|-------|----------------------|
| `--color-text-primary` | `#FAFAFA` | 19.3:1 ✅ |
| `--color-text-secondary` | `#A1A1AA` | 8.6:1 ✅ |
| `--color-text-tertiary` | `#71717A` | 4.6:1 ✅ |
| `--color-text-disabled` | `#52525B` | 3.0:1 (disabled — exempt) |
| `--color-text-inverse` | `#09090B` | On primary backgrounds |
| `--color-text-link` | `#A78BFA` | 7.2:1 ✅ |

### 4.5 Dark Theme — Sidebar

| Token | Value |
|-------|-------|
| `--color-sidebar-bg` | `rgba(9,9,11,0.95)` |
| `--color-sidebar-border` | `rgba(255,255,255,0.06)` |
| `--color-sidebar-item-default` | `#A1A1AA` |
| `--color-sidebar-item-hover` | `#FAFAFA` |
| `--color-sidebar-item-hover-bg` | `rgba(255,255,255,0.04)` |
| `--color-sidebar-item-active` | `#FAFAFA` |
| `--color-sidebar-item-active-bg` | `rgba(139,92,246,0.12)` |
| `--color-sidebar-item-active-indicator` | `#8B5CF6` |
| `--color-sidebar-section-label` | `#52525B` |

### 4.6 Dark Theme — Navbar

| Token | Value |
|-------|-------|
| `--color-navbar-bg` | `rgba(9,9,11,0.80)` |
| `--color-navbar-border` | `rgba(255,255,255,0.06)` |
| `--color-navbar-search-bg` | `rgba(255,255,255,0.04)` |
| `--color-navbar-search-border` | `rgba(255,255,255,0.08)` |
| `--color-navbar-search-placeholder` | `#52525B` |
| `--color-navbar-icon-default` | `#A1A1AA` |
| `--color-navbar-icon-hover` | `#FAFAFA` |

### 4.7 Dark Theme — Cards

| Token | Value |
|-------|-------|
| `--color-card-bg` | `#111114` |
| `--color-card-border` | `rgba(255,255,255,0.06)` |
| `--color-card-hover` | `#161619` |
| `--color-card-stat-icon-bg` | `rgba(139,92,246,0.10)` |

### 4.8 Dark Theme — Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.5)` |
| `--shadow-glow-primary` | `0 0 20px rgba(139,92,246,0.15)` |

**Why stronger shadows in dark theme:** Shadows must be more pronounced on dark backgrounds to remain visible. Glow effects replace traditional shadows for primary interactive elements.

### 4.9 Dark Theme — Semantic Status

| Status | Default | Subtle BG | Text |
|--------|---------|-----------|------|
| Success | `#22C55E` | `rgba(34,197,94,0.10)` | `#4ADE80` |
| Warning | `#F59E0B` | `rgba(245,158,11,0.10)` | `#FBBF24` |
| Error | `#EF4444` | `rgba(239,68,68,0.10)` | `#F87171` |
| Info | `#3B82F6` | `rgba(59,130,246,0.10)` | `#60A5FA` |

---

## 5. Light Theme

Light theme provides an alternative for users who prefer traditional bright interfaces or work in high-ambient-light environments.

**Why light theme exists:** Not all users prefer dark mode. Client portal users accessing the app on mobile outdoors, presentation scenarios, and accessibility needs (some visual impairments favor light backgrounds) all require a polished light alternative. Both themes must feel equally premium.

### 5.1 Light Theme — Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-base` | `#FFFFFF` | Page background |
| `--color-bg-subtle` | `#F9FAFB` | Subtle background areas |
| `--color-bg-muted` | `#F3F4F6` | Input backgrounds, code blocks |
| `--color-bg-emphasis` | `#E5E7EB` | Row hover, highlighted sections |

### 5.2 Light Theme — Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--color-surface-default` | `#FFFFFF` | Cards, panels |
| `--color-surface-elevated` | `#FFFFFF` | Modals, dropdowns (shadow-based elevation) |
| `--color-surface-overlay` | `rgba(0,0,0,0.40)` | Modal/drawer backdrop |
| `--color-surface-glass` | `rgba(255,255,255,0.85)` | Glassmorphism — navbar (subtle) |

**Why no glassmorphism on cards in light theme:** Glass effects are less visible on white backgrounds and can reduce text contrast. Light theme uses shadow-based elevation instead.

### 5.3 Light Theme — Borders

| Token | Value |
|-------|-------|
| `--color-border-default` | `#E5E7EB` |
| `--color-border-subtle` | `#F3F4F6` |
| `--color-border-strong` | `#D1D5DB` |
| `--color-border-focus` | `#7C3AED` |

### 5.4 Light Theme — Text

| Token | Value | Contrast on `#FFFFFF` |
|-------|-------|----------------------|
| `--color-text-primary` | `#111827` | 17.4:1 ✅ |
| `--color-text-secondary` | `#6B7280` | 5.7:1 ✅ |
| `--color-text-tertiary` | `#9CA3AF` | 3.4:1 (large text only) |
| `--color-text-disabled` | `#D1D5DB` | 1.5:1 (disabled — exempt) |
| `--color-text-inverse` | `#FFFFFF` | On primary backgrounds |
| `--color-text-link` | `#7C3AED` | 5.8:1 ✅ |

### 5.5 Light Theme — Sidebar

| Token | Value |
|-------|-------|
| `--color-sidebar-bg` | `#FAFAFA` |
| `--color-sidebar-border` | `#E5E7EB` |
| `--color-sidebar-item-default` | `#6B7280` |
| `--color-sidebar-item-hover` | `#111827` |
| `--color-sidebar-item-hover-bg` | `#F3F4F6` |
| `--color-sidebar-item-active` | `#7C3AED` |
| `--color-sidebar-item-active-bg` | `rgba(124,58,237,0.08)` |
| `--color-sidebar-item-active-indicator` | `#7C3AED` |
| `--color-sidebar-section-label` | `#9CA3AF` |

### 5.6 Light Theme — Navbar

| Token | Value |
|-------|-------|
| `--color-navbar-bg` | `rgba(255,255,255,0.90)` |
| `--color-navbar-border` | `#E5E7EB` |
| `--color-navbar-search-bg` | `#F3F4F6` |
| `--color-navbar-search-border` | `#E5E7EB` |
| `--color-navbar-search-placeholder` | `#9CA3AF` |
| `--color-navbar-icon-default` | `#6B7280` |
| `--color-navbar-icon-hover` | `#111827` |

### 5.7 Light Theme — Cards

| Token | Value |
|-------|-------|
| `--color-card-bg` | `#FFFFFF` |
| `--color-card-border` | `#E5E7EB` |
| `--color-card-hover` | `#F9FAFB` |
| `--color-card-stat-icon-bg` | `rgba(124,58,237,0.08)` |

### 5.8 Light Theme — Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.03)` |
| `--shadow-glow-primary` | `0 0 16px rgba(124,58,237,0.10)` |

### 5.9 Light Theme — Semantic Status

| Status | Default | Subtle BG | Text |
|--------|---------|-----------|------|
| Success | `#16A34A` | `rgba(22,163,74,0.08)` | `#15803D` |
| Warning | `#D97706` | `rgba(217,119,6,0.08)` | `#B45309` |
| Error | `#DC2626` | `rgba(220,38,38,0.08)` | `#B91C1C` |
| Info | `#2563EB` | `rgba(37,99,235,0.08)` | `#1D4ED8` |

### 5.10 Theme Switching Rules

| Rule | Detail |
|------|--------|
| Default | Dark theme on first visit |
| Persistence | User preference saved in local storage |
| Toggle location | Navbar — moon/sun icon |
| Transition | 200ms ease color transition on theme switch |
| System preference | Respect `prefers-color-scheme` on first visit if no saved preference |
| No flash | Theme applied before first paint (blocking script in `<head>`) |
| Charts | Chart colors remain the same in both themes; only grid/axis/tooltip adapt |
| Images | Logo and illustrations may need theme-specific variants |
| Consistency | Every component must define both dark and light token values |

**Why no flash:** A flash of wrong theme on page load is jarring and unprofessional. The theme must be determined before React hydrates.

---

## 6. Grid System

The grid system defines how content is organized across screen sizes. The application uses a **12-column grid** with responsive breakpoints.

**Why 12 columns:** Divisible by 2, 3, 4, and 6 — flexible enough for any layout combination (3-column stat cards, 2-column charts, 4-column metrics, sidebar + content splits).

### 6.1 Desktop (≥ 1280px)

| Property | Value |
|----------|-------|
| Columns | 12 |
| Column gap | 24px (`--spacing-6`) |
| Row gap | 24px (`--spacing-6`) |
| Page padding | 32px horizontal (`--spacing-8`) |
| Sidebar width | 260px (fixed) |
| Right panel width | 320px (fixed, dashboard only) |
| Content area | Fluid (remaining space) |
| Max content width | 1440px (`--container-2xl`) |

**Layout structure:**

```
┌──────────┬──────────────────────────────────────┬────────────┐
│          │           Navbar (full width)         │            │
│          ├──────────────────────────────────────┤            │
│ Sidebar  │                                      │ Right      │
│ 260px    │         Main Content Area            │ Panel      │
│          │         (12-col grid)                │ 320px      │
│          │                                      │ (optional) │
│          ├──────────────────────────────────────┤            │
│          │              Footer                   │            │
└──────────┴──────────────────────────────────────┴────────────┘
```

**Dashboard grid example:**

| Row | Columns | Content |
|-----|---------|---------|
| 1 | 3 + 3 + 3 + 3 | Four stat cards |
| 2 | 8 + 4 | Revenue chart + Project status donut |
| 3 | 6 + 6 | Recent projects + Recent invoices |

**Why this layout:** Matches the EliteFlow reference — stat cards across the top, charts in the middle, data tables at the bottom. Right panel for tasks, calendar, and AI assistant.

### 6.2 Laptop (1024px – 1279px)

| Property | Value |
|----------|-------|
| Columns | 12 |
| Column gap | 20px |
| Sidebar width | 240px (fixed) |
| Right panel | Hidden — content moves below main area |
| Stat cards | 2 per row (6 + 6) |
| Charts | Full width, stacked |

**Why:** Right panel hidden to preserve content area width. Stat cards at 2-per-row maintain readability. Charts stack vertically instead of side-by-side.

### 6.3 Tablet (768px – 1023px)

| Property | Value |
|----------|-------|
| Columns | 8 |
| Column gap | 16px |
| Sidebar | Collapsed to icon-only (64px) or hidden behind hamburger |
| Right panel | Hidden |
| Stat cards | 2 per row (4 + 4) |
| Tables | Horizontal scroll enabled |
| Page padding | 24px |

**Why:** Tablet users need touch-friendly targets and simplified navigation. Icon-only sidebar preserves screen space. Tables scroll horizontally rather than crushing columns.

### 6.4 Mobile (< 768px)

| Property | Value |
|----------|-------|
| Columns | 4 |
| Column gap | 12px |
| Sidebar | Hidden — hamburger menu overlay |
| Right panel | Hidden — accessible via bottom tabs or separate pages |
| Stat cards | 1 per row (full width) |
| Charts | Full width, simplified |
| Tables | Card-based layout (each row becomes a card) |
| Page padding | 16px |
| Bottom nav | Optional — key modules accessible via bottom bar |

**Why:** Mobile is a secondary experience for enterprise dashboards but must remain functional. Single-column layout, card-based tables, and hamburger navigation are proven mobile patterns.

### 6.5 Grid Rules

| Rule | Detail |
|------|--------|
| Always use the grid | No arbitrary `width` or `margin` for layout — use grid columns |
| Consistent gaps | Same gap token within a section; larger gap between sections |
| Align to grid | All elements align to column edges — no misaligned floats |
| Responsive by default | Every layout must define behavior at all four breakpoints |
| Content reflow | Elements reflow, never truncate or overlap |

---

## 7. Spacing System

Spacing creates visual rhythm and hierarchy. All spacing in the application uses tokens from the scale defined in [Section 2.6](#26-spacing-scale).

**Why a spacing system:** Arbitrary spacing (13px here, 17px there) creates subtle visual discord that users feel but cannot articulate. A systematic scale produces harmonious layouts automatically.

### 7.1 Spacing Application Rules

| Context | Token | Value |
|---------|-------|-------|
| **Page top padding** | `--spacing-8` (mobile) / `--spacing-12` (desktop) | 32px / 48px |
| **Section gap** (between major sections) | `--spacing-8` | 32px |
| **Card padding** | `--spacing-6` | 24px |
| **Card inner gap** (title to content) | `--spacing-4` | 16px |
| **Form field gap** (between fields) | `--spacing-4` | 16px |
| **Form label to input** | `--spacing-1.5` | 6px |
| **Button padding** (horizontal) | `--spacing-4` | 16px |
| **Button padding** (vertical) | `--spacing-2.5` | 10px |
| **Table cell padding** | `--spacing-3` horizontal, `--spacing-2.5` vertical | 12px / 10px |
| **Sidebar item padding** | `--spacing-3` vertical, `--spacing-4` horizontal | 12px / 16px |
| **Icon to text gap** | `--spacing-2` | 8px |
| **Badge padding** | `--spacing-1` vertical, `--spacing-2` horizontal | 4px / 8px |
| **Modal padding** | `--spacing-6` | 24px |
| **Grid gap** | `--spacing-6` (desktop) / `--spacing-4` (mobile) | 24px / 16px |
| **Inline element gap** | `--spacing-2` | 8px |
| **Stack gap** (vertical lists) | `--spacing-3` | 12px |

### 7.2 Spacing Hierarchy

```
Page
├── Section gap: 32px
│   ├── Card
│   │   ├── Card padding: 24px
│   │   ├── Title to content: 16px
│   │   └── Item gap: 12px
│   └── Card
└── Section gap: 32px
```

**Why hierarchy matters:** Outer spacing (section gaps) must be larger than inner spacing (card padding) which must be larger than element spacing (item gaps). This nesting creates clear visual grouping without explicit borders.

### 7.3 Spacing Rules

| Rule | Detail |
|------|--------|
| Use tokens only | Never use arbitrary pixel values |
| Increase outward | Outer spacing > inner spacing at every level |
| Consistent siblings | Sibling elements always have equal spacing |
| Responsive spacing | Reduce spacing on smaller screens (see breakpoint table) |
| White space is intentional | If it looks too spacious, the content is probably too dense — simplify content, not spacing |

---

## 8. Elevation System

Elevation communicates hierarchy through depth. Higher elevation = more important or more temporary content.

**Why elevation:** In a flat design, users cannot distinguish between a card, a dropdown, and a modal. Elevation creates a visual z-axis that matches the interaction model — page content is lowest, overlays are highest.

### 8.1 Elevation Levels

| Level | Name | Shadow | Border | Background | Usage |
|-------|------|--------|--------|------------|-------|
| 0 | Base | none | none | `--color-bg-base` | Page background |
| 1 | Raised | `--shadow-sm` | `--color-border-subtle` | `--color-surface-default` | Cards, panels, sidebar |
| 2 | Floating | `--shadow-md` | `--color-border-default` | `--color-surface-elevated` | Dropdowns, popovers, select menus |
| 3 | Overlay | `--shadow-lg` | `--color-border-default` | `--color-surface-elevated` | Modals, drawers, dialogs |
| 4 | Top | `--shadow-xl` | none | `--color-surface-elevated` | Command palette, toasts |

### 8.2 Elevation Rules

| Rule | Detail |
|------|--------|
| One level at a time | Elements jump one elevation level, not three |
| Shadow OR border | Use shadow-based elevation in light theme; border + subtle shadow in dark theme |
| Glass surfaces | Glassmorphism surfaces at Level 1 use blur instead of shadow |
| No elevation on text | Text and icons are always at Level 0 |
| Temporary = higher | Modals and dropdowns are temporary — they get higher elevation than persistent cards |
| Backdrop dims | Levels 3+ include a backdrop overlay at `--color-surface-overlay` |

### 8.3 Dark vs Light Elevation

| Aspect | Dark Theme | Light Theme |
|--------|-----------|-------------|
| Primary depth cue | Border + subtle glow | Shadow |
| Card elevation | Border `rgba(255,255,255,0.06)` + no shadow | Shadow `--shadow-sm`, no border |
| Modal elevation | Border + `--shadow-lg` | `--shadow-lg` only |
| Glass effect | `backdrop-blur(16px)` + semi-transparent bg | Minimal — shadow preferred |

**Why different approaches:** Shadows are less visible on dark backgrounds. Borders and glow effects provide depth without muddy shadows. Light backgrounds showcase shadows effectively.

---

## 9. Icon System

Icons communicate actions and categories quickly. The application uses a single icon library for consistency.

**Why a standardized icon system:** Mixing icon libraries (Heroicons + FontAwesome + custom SVGs) creates visual inconsistency in stroke width, corner radius, and grid alignment.

### 9.1 Icon Library

| Property | Value |
|----------|-------|
| Library | Lucide Icons |
| Style | Outlined (stroke-based) |
| Default size | 20px |
| Stroke width | 1.5px (default) / 2px (emphasis) |
| Corner style | Rounded |

**Why Lucide:** Open source, consistent 24×24 grid, 1.5px stroke, excellent React support, 1000+ icons, active maintenance. Visually aligned with Linear and Vercel icon styles.

### 9.2 Icon Sizes

| Token | Size | Usage |
|-------|------|-------|
| `--icon-size-xs` | 14px | Inline with small text, badges |
| `--icon-size-sm` | 16px | Table actions, compact buttons |
| `--icon-size-md` | 20px | Default — nav items, buttons, form fields |
| `--icon-size-lg` | 24px | Section headers, stat card icons |
| `--icon-size-xl` | 32px | Empty states, feature icons |
| `--icon-size-2xl` | 48px | Hero illustrations, onboarding |

### 9.3 Icon Color Rules

| Context | Color Token |
|---------|------------|
| Default | `--color-text-secondary` |
| Active/Selected | `--color-primary-default` or `--color-text-primary` |
| On primary button | `--color-text-inverse` |
| Destructive action | `--color-error-default` |
| Success indicator | `--color-success-default` |
| Disabled | `--color-text-disabled` |
| Sidebar (inactive) | `--color-sidebar-item-default` |
| Sidebar (active) | `--color-sidebar-item-active` |

### 9.4 Icon Usage Rules

| Rule | Detail |
|------|--------|
| Always pair with text | Icon-only buttons require `aria-label` and tooltip |
| Consistent sizing | All icons in a row/list use the same size token |
| Semantic icons | Use universally understood icons (trash = delete, pencil = edit, plus = create) |
| No decorative icons | Every icon must communicate meaning or action |
| Module icons | Each sidebar module has one assigned icon — never changes |
| Status icons | Status badges include icon + text — never color alone |

### 9.5 Module Icon Assignments

| Module | Icon |
|--------|------|
| Dashboard | `LayoutDashboard` |
| Clients | `Users` |
| Projects | `FolderKanban` |
| Tasks | `CheckSquare` |
| Invoices | `Receipt` |
| AI Documents | `FileText` |
| AI Assistant | `Bot` |
| Calendar | `Calendar` |
| File Manager | `FolderOpen` |
| Reports | `BarChart3` |
| Team | `UserCog` |
| Settings | `Settings` |
| Notifications | `Bell` |

**Why fixed assignments:** Users build muscle memory for navigation. Changing icons between modules or roles breaks spatial memory and slows navigation.

---

## 10. Motion Principles

Motion guides attention, provides feedback, and creates a polished feel. All animation must be purposeful — never decorative.

**Why motion matters:** Instant state changes feel jarring and cheap. Subtle transitions communicate causality (button press → modal opens) and help users track context changes. Products like Linear feel premium largely because of refined motion.

### 10.1 Motion Tokens

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `--motion-instant` | 0ms | — | Focus ring appearance |
| `--motion-fast` | 100ms | ease-out | Button press, toggle switch, checkbox |
| `--motion-normal` | 200ms | ease-in-out | Hover states, dropdown open, tooltip |
| `--motion-moderate` | 300ms | ease-in-out | Modal open/close, drawer slide, sidebar collapse |
| `--motion-slow` | 500ms | ease-in-out | Page transitions, chart animations |
| `--motion-slower` | 700ms | ease-in-out | Skeleton shimmer, complex chart entry |

| Easing Token | Curve | Usage |
|-------------|-------|-------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General purpose |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounce — toasts only |

### 10.2 Animation Patterns

| Pattern | Duration | Description |
|---------|----------|-------------|
| **Fade in** | 200ms | New content appearing (modals, toasts, dropdowns) |
| **Slide up** | 300ms | Modals, drawers entering from bottom |
| **Slide in** | 300ms | Sidebar drawer on mobile |
| **Scale in** | 200ms | Dropdown menus, popovers |
| **Skeleton shimmer** | 1500ms loop | Loading placeholder animation |
| **Chart draw** | 500ms | Line/bar chart entry animation |
| **Number count** | 700ms | Metric value counting up on dashboard load |
| **Stagger** | 50ms delay per item | List items appearing sequentially |

### 10.3 Motion Rules

| Rule | Detail |
|------|--------|
| Purpose only | Every animation must aid comprehension or provide feedback |
| Subtle by default | Users should feel the motion, not notice it |
| Fast interactions | Hover/press feedback ≤ 200ms — anything slower feels laggy |
| Respect `prefers-reduced-motion` | Disable all non-essential animation when user prefers reduced motion |
| No animation on data | Table data, form values, and text content never animate |
| Enter faster than exit | Elements appear at `--ease-out` (200ms), disappear at `--ease-in` (150ms) |
| No looping except loaders | Only skeleton shimmer and spinner loop; everything else plays once |
| Chart animation once | Charts animate on first render only, not on data update |

**Why `prefers-reduced-motion`:** Vestibular disorders affect a significant portion of users. Ignoring this preference causes physical discomfort. It is also a WCAG 2.1 requirement.

---

## 11. Accessibility Rules

Accessibility is a core design principle, not an afterthought. Every component must meet WCAG 2.1 Level AA.

**Why accessibility is non-negotiable:** Beyond legal compliance (ADA, EAA, Section 508), accessible design improves usability for all users. High contrast helps in sunlight, keyboard navigation helps power users, clear labels help everyone.

### 11.1 Color & Contrast

| Rule | Requirement |
|------|-------------|
| Normal text contrast | ≥ 4.5:1 against background |
| Large text contrast (≥ 18px bold or ≥ 24px) | ≥ 3:1 against background |
| UI component contrast | ≥ 3:1 against adjacent colors |
| Status colors | Never used alone — always paired with text label or icon |
| Focus ring contrast | ≥ 3:1 against all adjacent colors |
| Dark theme text | Primary `#FAFAFA` on `#09090B` = 19.3:1 ✅ |
| Light theme text | Primary `#111827` on `#FFFFFF` = 17.4:1 ✅ |

### 11.2 Keyboard Navigation

| Rule | Requirement |
|------|-------------|
| All interactive elements focusable | Tab order follows visual order |
| Focus ring visible | 2px `--color-border-focus` ring with 2px offset |
| Skip to content link | First focusable element on every page |
| Modal focus trap | Tab cycles within modal when open |
| Escape closes overlays | Modals, dropdowns, popovers, command palette |
| Arrow key navigation | Lists, menus, tabs, calendar |
| Enter/Space activates | Buttons, links, checkboxes, toggles |
| Keyboard shortcuts | `⌘K` search, `Esc` close, documented shortcuts |

### 11.3 Screen Readers

| Rule | Requirement |
|------|-------------|
| Semantic HTML | `<button>`, `<nav>`, `<main>`, `<table>`, `<form>` — not `<div>` everywhere |
| `aria-label` on icon-only buttons | "Delete client", "Close modal", "Toggle theme" |
| `aria-live` regions | Toast notifications, dynamic content updates |
| `role` attributes | `role="alert"` for errors, `role="status"` for success |
| Form labels | Every input has a visible `<label>` or `aria-label` |
| Table headers | `<th scope="col">` for all table columns |
| Image alt text | Descriptive alt for meaningful images; `alt=""` for decorative |
| Loading states | `aria-busy="true"` on loading containers |

### 11.4 Touch & Motor

| Rule | Requirement |
|------|-------------|
| Minimum touch target | 44×44px on mobile |
| Adequate spacing between targets | ≥ 8px between adjacent touch targets |
| No hover-only interactions | All hover-revealed actions available via click/tap or menu |
| Drag alternatives | Kanban boards must support keyboard/button move alternatives |
| Timeout warnings | Session timeouts warn user 2 minutes before expiry |

### 11.5 Cognitive

| Rule | Requirement |
|------|-------------|
| Consistent navigation | Same sidebar structure across all pages |
| Clear error messages | State what went wrong and how to fix it |
| Confirmation dialogs | Destructive actions (delete, cancel invoice) require confirmation |
| Progress indicators | Multi-step forms show current step and total steps |
| No time limits | Forms and interactions do not expire (except auth sessions) |
| Language | Plain language; avoid jargon in error messages and labels |

---

## 12. Responsive Rules

The application must be fully functional across all device categories. Responsive design is not optional — it is a core requirement.

**Why responsive:** Enterprise users check dashboards on phones during commutes, review reports on tablets in meetings, and work on desktops daily. A broken mobile experience means a broken product.

### 12.1 Breakpoint Behavior Summary

| Component | Desktop | Laptop | Tablet | Mobile |
|-----------|---------|--------|--------|--------|
| Sidebar | Full (260px) | Full (240px) | Icon-only (64px) | Hidden (hamburger) |
| Right panel | Visible (320px) | Hidden | Hidden | Hidden |
| Stat cards | 4 per row | 2 per row | 2 per row | 1 per row |
| Charts | Side by side | Stacked | Stacked | Stacked, simplified |
| Data tables | Full columns | Full columns | Horizontal scroll | Card layout |
| Modals | Centered overlay | Centered overlay | Centered overlay | Full-screen |
| Forms | Multi-column | Multi-column | Single column | Single column |
| Navigation | Sidebar | Sidebar | Sidebar (icons) | Bottom bar or hamburger |
| Command palette | Centered modal | Centered modal | Centered modal | Full-screen |
| Spacing | Full scale | Full scale | Reduced (75%) | Reduced (50%) |
| Font sizes | Full scale | Full scale | Full scale | Slightly reduced |

### 12.2 Responsive Rules

| Rule | Detail |
|------|--------|
| Mobile-first CSS | Base styles target mobile; breakpoints add complexity |
| Touch-friendly | All interactive elements ≥ 44px on mobile |
| No horizontal scroll | Page body never scrolls horizontally (tables excepted) |
| Content priority | Most important content appears first on mobile |
| Images scale | All images responsive — `max-width: 100%` |
| Test all breakpoints | Every screen tested at 375px, 768px, 1024px, 1440px |
| No device-specific hacks | Use standard breakpoints, not device detection |
| Performance on mobile | Lazy load charts, images, and below-fold content |

### 12.3 Dashboard-Specific Responsive Behavior

| Dashboard | Mobile Adaptation |
|-----------|-------------------|
| Super Admin | System metrics as single-column cards; admin tables scroll horizontally |
| Admin | Stat cards stack; charts simplify; quick actions in floating button |
| Employee | Task list becomes primary view; project cards stack |
| Client | Invoice and project status as cards; simplified portal navigation |

**Why role-specific adaptations:** Each dashboard has different primary tasks. Mobile layouts should prioritize the most common action for that role — Employee sees tasks first, Client sees invoice status first.

---

## 13. Component Design Rules

Every UI component in the application follows these rules. Components are organized in three layers (see ADR-017): `ui/` primitives → `common/` composites → `features/` specific.

**Why component rules:** Without rules, each developer builds their own button, table, and modal. After 20 modules, the application has 15 different button styles. Rules prevent this decay.

### 13.1 Buttons

| Variant | Usage | Visual |
|---------|-------|--------|
| **Primary** | Main action per section (Create, Save, Submit) | Purple background, white text |
| **Secondary** | Alternative actions (Cancel, Back, Export) | Transparent bg, border, primary text |
| **Ghost** | Tertiary actions (View, Edit, inline actions) | No bg, no border, text only |
| **Destructive** | Delete, remove, cancel subscription | Red background or red text |
| **Link** | Navigation actions (View all, Learn more) | Underline on hover, primary color |

| Property | Value |
|----------|-------|
| Height | 36px (default) / 32px (small) / 44px (large, mobile) |
| Padding | 16px horizontal |
| Border radius | `--radius-md` (8px) |
| Font | `--font-size-base`, `--font-weight-medium` |
| Icon gap | 8px between icon and text |
| Disabled | 40% opacity, no pointer events |
| Loading | Spinner replaces text; button width preserved |
| Max one primary | per visible section |

**Why one primary button per section:** Multiple primary buttons create decision paralysis. Users must instantly know the recommended action.

### 13.2 Inputs & Forms

| Property | Value |
|----------|-------|
| Height | 40px |
| Padding | 12px horizontal |
| Border radius | `--radius-md` (8px) |
| Border | 1px `--color-border-default` |
| Focus | 2px `--color-border-focus` ring |
| Error | Border `--color-error-default`, error message below |
| Label | Above input, `--font-size-sm`, `--font-weight-medium` |
| Helper text | Below input, `--font-size-xs`, `--color-text-tertiary` |
| Required indicator | Asterisk (*) after label |
| Placeholder | `--color-text-tertiary` — hint only, not a label substitute |

**Why labels above inputs:** Top-aligned labels scan faster in forms with multiple fields. Placeholder-as-label is an accessibility failure — labels disappear on focus.

### 13.3 Cards

| Property | Value |
|----------|-------|
| Background | `--color-card-bg` |
| Border | 1px `--color-card-border` |
| Border radius | `--radius-lg` (12px) |
| Padding | 24px |
| Shadow | `--shadow-sm` (light) / none (dark) |
| Hover (interactive) | `--color-card-hover` background |
| Header | Title `--font-size-md` semibold + optional action button |
| Content gap | 16px below header |

### 13.4 Tables

| Property | Value |
|----------|-------|
| Header background | `--color-bg-muted` |
| Header text | `--font-size-xs`, uppercase, `--letter-spacing-wide`, `--font-weight-medium` |
| Row height | 48px minimum |
| Row border | 1px `--color-border-subtle` bottom |
| Row hover | `--color-bg-emphasis` |
| Cell padding | 12px horizontal, 10px vertical |
| Sortable columns | Arrow icon on hover |
| Actions column | Right-aligned, icon buttons |
| Empty state | Centered `EmptyState` component |
| Loading state | Skeleton rows (5 rows default) |
| Pagination | Bottom-right, 20 rows default |

**Why 48px row height:** Tall enough for touch targets, short enough to show 10+ rows without scrolling. Enterprise tables must display data efficiently.

### 13.5 Badges & Status

| Property | Value |
|----------|-------|
| Height | 22px |
| Padding | 4px vertical, 8px horizontal |
| Border radius | `--radius-sm` (6px) |
| Font | `--font-size-xs`, `--font-weight-medium` |
| Background | Semantic subtle color (10% opacity) |
| Text | Semantic text color |
| Icon | Optional 14px icon before text |

| Status | Background | Text | Icon |
|--------|-----------|------|------|
| Active / Paid / Completed | Success subtle | Success text | `CheckCircle` |
| Pending / In Progress | Warning subtle | Warning text | `Clock` |
| Overdue / Failed / Error | Error subtle | Error text | `AlertCircle` |
| Draft / Not Started | Muted bg | Tertiary text | `Circle` |
| On Hold | Info subtle | Info text | `PauseCircle` |

### 13.6 Modals & Dialogs

| Property | Value |
|----------|-------|
| Max width | 480px (small) / 640px (medium) / 768px (large) |
| Border radius | `--radius-xl` (16px) |
| Padding | 24px |
| Backdrop | `--color-surface-overlay` |
| Animation | Scale in 200ms + fade |
| Close | X button top-right + Escape key + backdrop click |
| Focus trap | Tab cycles within modal |
| Actions | Right-aligned — Cancel (secondary) + Confirm (primary) |
| Destructive confirm | Red primary button, explicit action description |

### 13.7 Navigation (Sidebar)

| Property | Value |
|----------|-------|
| Width | 260px (desktop) / 240px (laptop) / 64px (tablet) |
| Item height | 40px |
| Item padding | 12px vertical, 16px horizontal |
| Active indicator | 3px left border `--color-sidebar-item-active-indicator` |
| Section labels | Uppercase, `--font-size-xs`, `--letter-spacing-wide` |
| Icon size | 20px |
| Icon-to-text gap | 12px |
| Collapse behavior | Tablet: icon-only; Mobile: hidden |

### 13.8 Toasts & Notifications

| Property | Value |
|----------|-------|
| Position | Top-right, 16px from edge |
| Width | 380px max |
| Duration | 5 seconds (success/info) / 8 seconds (error) |
| Animation | Slide in from right + fade out |
| Stack | Max 3 visible; oldest dismissed first |
| Variants | Success, Error, Warning, Info — semantic colors |
| Action | Optional action button (e.g., "Undo") |
| Close | X button + auto-dismiss |

### 13.9 Required UI States

Every data-driven component must implement all four states:

| State | Component | Visual |
|-------|-----------|--------|
| **Loading** | `Skeleton` / `LoadingState` | Animated placeholder matching content shape |
| **Empty** | `EmptyState` | Illustration + message + optional CTA button |
| **Error** | `ErrorState` | Error icon + message + retry button |
| **Success** | Normal content | Data rendered correctly |

**Why four mandatory states:** A blank screen during loading, an empty table with no message, or a silent error destroys user trust. These states must be designed, not left as afterthoughts.

---

## 14. UI Consistency Rules

These rules ensure the application looks and feels like one product across all modules and dashboards.

**Why consistency rules:** Design systems fail not because tokens are wrong, but because developers bypass them. These rules are the enforcement mechanism.

### 14.1 Visual Consistency

| # | Rule |
|---|------|
| 1 | Use design tokens for all colors, spacing, typography, shadows, and radii |
| 2 | Never hardcode hex values, pixel values, or font names in components |
| 3 | Same element = same token everywhere (all cards use `--radius-lg`, all buttons use `--radius-md`) |
| 4 | Status colors are semantic — green always means success, red always means error |
| 5 | Icons from Lucide only — no mixing icon libraries |
| 6 | All text uses the defined type scale — no arbitrary font sizes |
| 7 | Spacing follows the scale — no arbitrary margins or padding |

### 14.2 Component Consistency

| # | Rule |
|---|------|
| 1 | One component per pattern — one `StatCard`, one `DataTable`, one `StatusBadge` |
| 2 | Build from layers — features use `common/`, common uses `ui/` — never skip layers |
| 3 | No copy-paste components — if you need a button, use `Button` from `ui/` |
| 4 | Props over variants — configure components via props, not by creating new components |
| 5 | All four UI states implemented — loading, empty, error, success |
| 6 | Destructive actions always use `Destructive` button variant + confirmation dialog |

### 14.3 Layout Consistency

| # | Rule |
|---|------|
| 1 | Page structure: PageHeader → Content → (optional Footer) |
| 2 | Dashboard layout: Stats row → Charts row → Data tables row |
| 3 | Form layout: Label above input, errors below input, actions bottom-right |
| 4 | Modal layout: Title → Content → Actions (right-aligned) |
| 5 | Table layout: Toolbar (search, filters) → Table → Pagination |
| 6 | Sidebar order consistent across all roles — modules appear in the same sequence |

### 14.4 Content Consistency

| # | Rule |
|---|------|
| 1 | Currency formatted with symbol and 2 decimal places (`$24,590.00`) |
| 2 | Dates formatted consistently (`May 15, 2026` or relative `2 hours ago`) |
| 3 | Empty states include actionable guidance ("No clients yet. Create your first client.") |
| 4 | Error messages state the problem and solution ("Email is required" not "Invalid input") |
| 5 | Button labels are verb-first ("Create Client", "Save Changes", "Delete Project") |
| 6 | Confirmation dialogs name the item ("Delete client Acme Corp?" not "Are you sure?") |

---

## 15. Enterprise Design Rules

These are mandatory rules for all team members. Violations must be corrected before merge.

### 15.1 Token Rules

| # | Rule | Why |
|---|------|-----|
| 1 | All colors reference semantic tokens | Enables theme switching and global updates |
| 2 | All spacing uses the spacing scale | Prevents visual rhythm breakdown |
| 3 | All typography uses the type scale | Ensures hierarchy consistency |
| 4 | All shadows use elevation tokens | Maintains depth hierarchy |
| 5 | All border radii use radius tokens | Prevents mismatched corner styles |
| 6 | No raw hex, rgb, or hsl in components | Tokens are the only source of truth |

### 15.2 Component Rules

| # | Rule | Why |
|---|------|-----|
| 1 | One component per UI pattern — never duplicate | "Build once, use everywhere" is the core principle |
| 2 | Three-layer hierarchy: ui → common → features | Enforces reusability and separation |
| 3 | All data views implement 4 states | Prevents blank screens and user confusion |
| 4 | Destructive actions require confirmation | Prevents accidental data loss in enterprise context |
| 5 | Forms use React Hook Form + Zod | Consistent validation and error handling |
| 6 | Tables use the shared DataTable component | Consistent sorting, pagination, filtering |
| 7 | Charts use shared chart components | Consistent colors, tooltips, and legends |

### 15.3 Theme Rules

| # | Rule | Why |
|---|------|-----|
| 1 | Every component must work in both dark and light themes | Users choose their preference |
| 2 | Dark theme is the default | Matches design reference and user expectation |
| 3 | Theme applied before first paint — no flash | Professional loading experience |
| 4 | Test both themes before PR submission | Theme bugs are common and jarring |
| 5 | Images and logos may need theme-specific variants | Visibility on both backgrounds |

### 15.4 Accessibility Rules

| # | Rule | Why |
|---|------|-----|
| 1 | WCAG 2.1 AA compliance on all components | Legal requirement and quality standard |
| 2 | Keyboard navigation on all interactive elements | Power users and motor disability support |
| 3 | Focus ring visible on every focusable element | Keyboard users must see where they are |
| 4 | Color never used alone to convey status | Colorblind users must understand status |
| 5 | `prefers-reduced-motion` respected | Vestibular disorder accommodation |
| 6 | Touch targets ≥ 44px on mobile | Motor disability and touch accuracy |

### 15.5 Dashboard Rules

| # | Rule | Why |
|---|------|-----|
| 1 | All four dashboards share the same component library | Visual consistency across roles |
| 2 | Role differences are content and permissions, not visual language | Users with multiple roles see familiar UI |
| 3 | Sidebar modules in the same order across roles | Muscle memory and predictability |
| 4 | Dashboard stat cards use the shared `StatCard` component | Consistent metric presentation |
| 5 | Role-specific modules hidden, not styled differently | Client does not see Admin modules at all |
| 6 | Each dashboard has a welcome message with user's name | Personalization without visual change |

### 15.6 Quality Gates

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | Design review required for new components | PR review by Frontend Lead |
| 2 | Screenshot required for UI changes (dark + light) | PR template |
| 3 | Accessibility audit for new interactive components | PR review checklist |
| 4 | Responsive test at 4 breakpoints before merge | PR review checklist |
| 5 | No design token violations | Linting + code review |
| 6 | Component documented in design system when added | Design system update in same PR |

---

## Appendix A: Role-Based Dashboard Differences

All dashboards share the same design system. Differences are content, modules, and data — never visual treatment.

| Aspect | Super Admin | Admin | Employee | Client |
|--------|------------|-------|----------|--------|
| **Sidebar modules** | All + System Settings | All business modules | Tasks, Projects, Calendar, Team | Projects, Invoices, Documents, Chat |
| **Dashboard stats** | System-wide metrics | Company metrics | Personal tasks, assigned projects | Own invoices, project status |
| **Primary color usage** | Same tokens | Same tokens | Same tokens | Same tokens |
| **Right panel** | System alerts | Tasks, Calendar, AI | Tasks, Calendar | Messages, Support |
| **Actions** | System management | Full CRUD | Assigned work only | View + limited actions |
| **Data scope** | All companies | Own company | Assigned items | Own data only |

---

## Appendix B: Design Token Quick Reference

| Category | Token Count | Key Tokens |
|----------|-------------|------------|
| Colors (semantic) | 40+ | primary, success, error, text-primary, card-bg |
| Typography | 20+ | font-size-base, font-weight-medium, line-height-normal |
| Spacing | 16 | spacing-1 through spacing-24 |
| Radius | 7 | radius-sm through radius-full |
| Shadows | 9 | shadow-sm through shadow-glow-primary |
| Z-index | 10 | z-index-dropdown through z-index-command |
| Motion | 11 | motion-fast through motion-slower |
| Icons | 6 sizes | icon-size-sm through icon-size-2xl |
| Breakpoints | 6 | breakpoint-sm through breakpoint-2xl |

---

## Related Documentation

- [ADR-017: Enterprise Design System](../adr/ADR-017-enterprise-design-system.md)
- [ADR-003: Tailwind CSS](../adr/ADR-003-tailwind-css.md)
- [ADR-004: shadcn/ui](../adr/ADR-004-shadcn-ui.md)
- [Enterprise Folder Architecture](../../ENTERPRISE_ARCHITECTURE.md)
- [Project Plan](../../PROJECT_PLAN.md)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-22 | Initial design system specification |
