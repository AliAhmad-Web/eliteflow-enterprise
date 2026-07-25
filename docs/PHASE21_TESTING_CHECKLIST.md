# Phase 21 — Responsive Design Testing Checklist

Use DevTools device mode (or real devices). Suggested widths: **375**, **640**, **768**, **1024**, **1280**, **1440**, **2560**.

Test both **portrait** and **landscape** on tablet/mobile. Dark + light theme sample at least once.

---

## Prerequisites

- [ ] Web app running (`npm run web:dev`)
- [ ] Logged in as Admin (or Super Admin) with full nav
- [ ] Optional: Employee + Client for role dashboards

---

## Global shell

- [ ] **&lt; 768px:** Fixed sidebar hidden; hamburger opens slide drawer; drawer closes on navigate
- [ ] **≥ 768px:** Fixed sidebar visible; collapse toggle works; state survives refresh (`eliteflow-ui`)
- [ ] **≥ 1280px:** Right utility panel visible when open; toggle persists
- [ ] Skip link focuses `#main-content`
- [ ] No horizontal page scroll on body (tables may scroll internally)
- [ ] Header height / padding comfortable on 375px and 1440px

---

## Navbar

- [ ] Search: icon → sheet on mobile; inline field from `md`
- [ ] Ctrl/Cmd+K focuses desktop search or opens mobile search sheet
- [ ] AI Assistant icon routes to `/ai-assistant`
- [ ] Quick Actions menu shows only permitted items
- [ ] Notifications + profile menus usable on touch (44px targets)

---

## Dashboard

- [ ] KPI cards: 1 col mobile → 2 col tablet → 4 col desktop
- [ ] Charts scale without clipping (`chart-responsive`)
- [ ] Admin / Employee / Client / Super Admin layouts stack then split correctly
- [ ] Under `xl`, right-panel duplicate content appears on Admin dashboard

---

## Tables (Clients, Projects, Tasks, Invoices)

- [ ] **Mobile:** Card list; tap title opens detail; actions menu works
- [ ] **Tablet+:** Table with sticky header while scrolling container
- [ ] Sort controls still work
- [ ] Filters + pagination unchanged and usable on narrow screens
- [ ] Compact column hiding (status visible; secondary columns progressive)

---

## Forms & dialogs

- [ ] Settings forms: single column until `lg`, then multi-column
- [ ] Create/edit dialogs: **full-screen on mobile**, centered modal from `sm`
- [ ] Dialog close (X / Esc / overlay) works on mobile full-screen
- [ ] Sheet drawers (tasks/invoices/details) fit viewport width

---

## Settings

- [ ] Below `lg`: section `<select>` switches panels
- [ ] From `lg`: left nav buttons; `aria-current` on active section
- [ ] Dirty-section confirm still fires when switching
- [ ] Profile / Company / Notifications / AI / Security / API Keys / Billing sections readable without overflow

---

## Integrations

- [ ] Metric cards stack → 2 → 4 columns
- [ ] Integration cards: 1 → 2 (`md`) → 3 (`xl`) columns
- [ ] Detail / monitoring tabs scroll horizontally if needed; no page-level overflow
- [ ] Connection status + usage blocks readable on 375px

---

## Communication

- [ ] `/messages`: list / thread / details panel switching on mobile (existing Phase 20 behavior)
- [ ] Channels, Announcements, Threads, Meetings, Activity usable at 375px and 1024px
- [ ] Composers and action bars do not overflow

---

## Calendar & files

- [ ] Calendar: side rail stacks below `lg`; dual column from `lg`
- [ ] File manager: folder rail + content from `lg`; grid cards responsive

---

## Charts / reports / AI

- [ ] Reports charts resize with viewport
- [ ] AI Assistant page usable on mobile (composer + history)
- [ ] No janky animations on mobile; reduced-motion respected OS setting

---

## Accessibility smoke

- [ ] Keyboard: Tab through header → main; Enter activates buttons
- [ ] Focus rings visible
- [ ] Screen reader: mobile nav announces title; sidebar collapse label updates
- [ ] High-contrast mode (OS) increases border/ring visibility

---

## Regression (previous phases)

- [ ] Login / OTP / sessions still work
- [ ] RBAC still hides unauthorized nav items
- [ ] Invoice PDF download, task CRUD, client CRUD still work after layout changes
- [ ] No console errors when resizing across breakpoints

---

## Sign-off

| Viewport | Tester | Pass |
|----------|--------|------|
| 375 mobile | | |
| 768 tablet | | |
| 1024 laptop | | |
| 1440 desktop | | |
| 2560 ultra-wide | | |
| Landscape spot-check | | |
