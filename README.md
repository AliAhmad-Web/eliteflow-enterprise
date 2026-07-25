# EliteFlow

**Enterprise Business Management Platform** — v1.0.0

EliteFlow is a full-stack enterprise platform for managing clients, projects, tasks, communication, reporting, and AI-assisted workflows. It ships as an npm workspaces monorepo with a Next.js web app, Express API, Expo mobile client, Prisma database package, and shared TypeScript contracts.

> **License:** Proprietary — Copyright © 2026 Ali Ahmad. All rights reserved. See [LICENSE](./LICENSE).

---

## Project Overview

EliteFlow centralizes day-to-day business operations behind role-based access (Super Admin, Admin, Employee, Client). Web and mobile clients consume the same REST API (`/api/v1`), share Zod schemas and permission constants via `@enterprise/shared`, and use PostgreSQL through Prisma.

**Version:** `1.0.0`  
**Node.js:** `>= 20`  
**Package manager:** npm (workspaces + root `package-lock.json`)

---

## Features

- Authentication — signup, login, OTP, email verification, password reset, OAuth (Google / GitHub)
- Role management — RBAC with permission-gated UI and API routes
- Dashboards — role-aware KPIs, activity, and quick actions
- Client, project, and task management
- AI assistant — configurable providers (Gemini / OpenAI / mock)
- Communication hub
- Calendar and upcoming events
- Reports and analytics
- Settings and integrations (Gmail, Google Calendar, GitHub)
- File manager with local or Supabase storage
- Notifications
- Responsive web UI (Enterprise UI/UX V3)
- Performance optimizations (virtualization, caching, compression)
- Mobile application (Expo SDK 57)
- Production-ready architecture (typed monorepo, migrations, env separation)

---

## Monorepo Structure

```
├── apps/
│   ├── api/          # Express REST API (@enterprise/api)
│   ├── web/          # Next.js App Router frontend (web)
│   └── mobile/       # Expo / React Native client (@enterprise/mobile)
├── packages/
│   ├── database/     # Prisma schema, migrations, seed (@enterprise/database)
│   └── shared/       # Shared types, Zod schemas, permissions (@enterprise/shared)
├── docs/             # Architecture notes, ADRs, phase reports
├── package.json      # Workspace root scripts
└── package-lock.json
```

---

## Technology Stack

| Layer | Stack |
|-------|--------|
| Web | Next.js 16, React 19, Tailwind CSS 4, TanStack Query, Zustand, Framer Motion |
| API | Express 5, TypeScript, Argon2, Jose/JWT, Helmet, Multer |
| Mobile | Expo SDK 57, Expo Router, React Native, TanStack Query, SecureStore |
| Data | PostgreSQL, Prisma 6 |
| Shared | Zod, TypeScript |
| Auth / storage | Supabase (OAuth, optional file storage) |
| Email | Resend |
| AI | Google Gemini / OpenAI (optional; mock fallback) |

---

## Installation

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local or hosted)
- npm 10+

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd "Enterprise Business Management Web Application"

# Install all workspace dependencies
npm install

# Configure environment files (see below)
cp .env.example packages/database/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# Generate Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# Optional demo seed (development)
npm run db:seed
```

---

## Environment Variables

Never commit real secrets. Use the `.env.example` files as templates.

### Database (`packages/database/.env` or root `.env.example`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SEED_DEMO_PASSWORD` | Dev seed password only |

### API (`apps/api/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `4000`) |
| `DATABASE_URL` | Same database as Prisma |
| `JWT_SECRET` | Access/refresh signing secret (min 32 chars) |
| `CORS_ORIGIN` / `FRONTEND_URL` | Web origin(s); HTTPS in production |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | OAuth and optional storage |
| `RESEND_API_KEY` / `EMAIL_FROM` | Transactional email |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | AI providers (optional) |
| `STORAGE_PROVIDER` | `local` or `supabase` |
| Integration OAuth keys | Google / GitHub connect flows |

### Web (`apps/web/.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | API base URL |
| `NEXT_PUBLIC_APP_URL` | Web app URL |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client OAuth |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Optional reCAPTCHA v3 |

### Mobile (`apps/mobile/.env`)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | API base URL (use LAN IP for physical devices) |

---

## Development Commands

From the repository root:

```bash
# API + web (concurrent)
npm run dev

# Individual apps
npm run api:dev
npm run web:dev
npm run mobile:start

# Database
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio

# Quality
npm run type-check
npm run lint
```

| Command | Description |
|---------|-------------|
| `npm run api:dev` | API with hot reload (`tsx watch`) |
| `npm run web:dev` | Next.js development server (port 3000) |
| `npm run mobile:start` | Expo development server |
| `npm run type-check` | TypeScript across shared, api, web, mobile |
| `npm run lint` | ESLint for the web app |

---

## Production Build Commands

```bash
# Install with locked dependencies
npm ci

# Prisma client + deploy migrations
npm run db:generate
npm run db:migrate:deploy

# Build shared → API → web
npm run build

# Type-check and lint
npm run type-check
npm run lint

# Start compiled API
npm run start --workspace=@enterprise/api

# Start Next.js production server
npm run start --workspace=web
```

Root `npm run build` compiles `@enterprise/shared`, `@enterprise/api`, and `web` in order.

---

## Deployment Overview

| Surface | Typical host | Notes |
|---------|--------------|--------|
| Web | Vercel | Set `NEXT_PUBLIC_*` in project env; point at production API |
| API | Node host / container / PaaS | Set `NODE_ENV=production`, HTTPS origins, secrets |
| Database | Managed PostgreSQL | Run `npm run db:migrate:deploy` on release |
| Files | Supabase Storage (recommended) | `STORAGE_PROVIDER=supabase` |
| Mobile | EAS Build / Expo | Set `EXPO_PUBLIC_API_URL` for production |

Do not use `localhost` or plain `http` origins for production CORS / frontend URLs. Rotate `JWT_SECRET` and encryption keys per environment.

---

## Mobile Application

The mobile app (`apps/mobile`) is an Expo SDK 57 client of the same API — it does not duplicate backend logic or schema.

```bash
# Ensure API is running
npm run api:dev

# Configure EXPO_PUBLIC_API_URL, then:
npm run mobile:start
```

- Auth uses the same JWT + refresh cookie flow as web (SecureStore on device)
- Themes mirror web tokens (light, dark, emerald, sapphire)
- Production builds: EAS with production `EXPO_PUBLIC_API_URL`

See [apps/mobile/README.md](./apps/mobile/README.md) for details.

---

## Folder Structure

```
Enterprise Business Management Web Application/
├── apps/
│   ├── api/
│   │   └── src/              # server, modules, integrations
│   ├── web/
│   │   └── src/              # App Router pages, components, stores
│   └── mobile/
│       ├── app/              # Expo Router screens
│       └── src/              # api client, auth, theme, UI
├── packages/
│   ├── database/
│   │   └── prisma/           # schema, migrations, seed
│   └── shared/
│       └── src/              # types, schemas, permissions
├── docs/                     # architecture & phase documentation
├── LICENSE
├── README.md
├── package.json
└── package-lock.json
```

---

## License

Copyright © 2026 Ali Ahmad. All Rights Reserved.

This software is proprietary and confidential. Unauthorized copying, modification, redistribution, reverse engineering, or commercial use is prohibited without written permission from the author.

See [LICENSE](./LICENSE) for the full text.

---

## Future Roadmap

Planned directions after v1.0.0 (subject to product priorities):

- Hardened multi-region production deployment and observability
- Expanded mobile parity with remaining web workflows
- Advanced reporting and export pipelines
- Deeper third-party integrations and webhook automation
- Enhanced AI workflows (tooling, audit trails, org policies)
- Marketplace-ready packaging and tenant onboarding improvements

---

**EliteFlow v1.0.0** — first stable production release.
**Status:** Repository prepared for production deployment (deploy separately with approval).
)
