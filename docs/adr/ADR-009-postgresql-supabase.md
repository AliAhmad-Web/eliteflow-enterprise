# ADR-009: Why PostgreSQL (Supabase)

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application requires a relational database to store structured business data: users, clients, projects, tasks, invoices, payments, team records, calendar events, files metadata, notifications, and audit logs. The data model involves complex relationships, transactional integrity (especially for billing), and role-based data access.

The application also requires authentication (social login), file storage, and potentially realtime features — capabilities that Supabase provides alongside PostgreSQL hosting.

---

## Problem

We need a database solution that can:

- Store relational data with ACID compliance for financial transactions (invoicing, payments)
- Support complex queries with joins across 30+ tables
- Handle role-based data access (Super Admin sees all, Client sees only their data)
- Provide managed hosting with automated backups and point-in-time recovery
- Support connection pooling for production API workloads
- Integrate with our Prisma ORM for type-safe access
- Offer authentication services (Google, GitHub login) alongside the database
- Provide file storage for documents, attachments, and avatars
- Scale from development to production without infrastructure management
- Support JSON columns for flexible metadata storage

The database is the foundation of the entire application. A poor choice leads to data integrity issues, performance bottlenecks, and costly migrations later.

---

## Decision

We will use **PostgreSQL** as the primary database, hosted via **Supabase**.

### Division of responsibilities:

| Concern | Technology | Layer |
|---------|-----------|-------|
| **Database** | PostgreSQL (via Supabase) | Data storage, ACID transactions |
| **ORM** | Prisma | Type-safe queries, migrations |
| **Auth** | Supabase Auth + Custom JWT | Social login, session management |
| **Storage** | Supabase Storage | File uploads, document storage |
| **Realtime** | Supabase Realtime (optional) | Live notifications, chat |
| **Connection** | Supabase Pooler | Production connection pooling |

### Key choices:

- **PostgreSQL** for all structured data — accessed exclusively through Prisma
- **Supabase** as the managed PostgreSQL host — not as the primary data access layer
- **Supabase Auth** for social login (Google, GitHub) — tokens managed by our Express backend
- **Supabase Storage** for file uploads — abstracted behind `integrations/supabase/supabase.storage.ts`
- **`DATABASE_URL`** points to Supabase PostgreSQL connection string
- **Row Level Security (RLS)** configured on Supabase for defense-in-depth, but primary authorization handled by Express middleware

---

## Consequences

### Positive

- **ACID compliance** — critical for invoice creation, payment processing, and financial reports
- **Relational integrity** — foreign keys, constraints, and joins across complex data models
- **Managed hosting** — Supabase handles backups, scaling, monitoring, and connection pooling
- **All-in-one platform** — database + auth + storage + realtime from a single provider
- **Prisma compatibility** — PostgreSQL is Prisma's best-supported database
- **JSON support** — `jsonb` columns for flexible metadata without schema changes
- **Full-text search** — PostgreSQL native search for clients, projects, documents
- **Free tier** — sufficient for development; predictable pricing for production

### Negative

- **Vendor coupling** — Supabase-specific connection strings, auth, and storage APIs
- **RLS complexity** — dual authorization (Express middleware + Supabase RLS) requires careful coordination
- **Not serverless-native** — persistent connections require pooling; not ideal for edge functions
- **Migration from Supabase** — moving to self-hosted PostgreSQL requires auth and storage migration too

### Neutral

- Supabase provides the PostgreSQL instance; Prisma is the sole data access method for business logic
- Supabase Dashboard available for manual data inspection during development

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **MySQL** | Weaker JSON support; less powerful query optimizer; Prisma supports it but PostgreSQL is preferred |
| **MongoDB** | NoSQL unsuitable for relational billing data; no ACID transactions across documents; invoice relationships require joins |
| **PlanetScale (MySQL)** | No foreign key constraints; incompatible with Prisma relations at scale |
| **Firebase/Firestore** | NoSQL; no complex queries; vendor lock-in; poor fit for relational enterprise data |
| **Self-hosted PostgreSQL** | Infrastructure management overhead; no built-in auth, storage, or realtime |
| **Neon (serverless PostgreSQL)** | Good alternative but lacks integrated auth and storage; would need separate providers |
| **CockroachDB** | Distributed SQL overkill for current scale; higher complexity and cost |

---

## Why This Decision Is Best

PostgreSQL is the world's most advanced open-source relational database. For an enterprise application with **invoicing, payments, role-based access, and complex relationships**, a relational database with ACID compliance is non-negotiable. NoSQL databases cannot enforce the financial data integrity this application requires.

Supabase provides the best developer experience for PostgreSQL hosting in 2026 — managed infrastructure, integrated auth, file storage, and a generous free tier. Using Supabase as the platform while accessing data through Prisma gives us the best of both worlds: managed infrastructure with type-safe, migration-controlled data access.

The dual approach (Supabase for platform services, Prisma for data access, Express for business logic) keeps each layer focused. We get Supabase's convenience without coupling our business logic to their SDK.
