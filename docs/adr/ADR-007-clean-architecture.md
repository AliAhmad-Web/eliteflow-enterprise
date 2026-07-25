# ADR-007: Why Clean Architecture

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application backend (`apps/api`) handles critical business operations: authentication, billing, client data, project management, invoicing with Stripe integration, AI document generation, and file storage. The backend must be maintainable, testable, and resilient to changes in external services (database, payment providers, email services, AI APIs).

Business logic must not be coupled to HTTP frameworks, database implementations, or third-party SDKs. When we switch email providers from Resend to SendGrid, or change storage from Supabase to S3, the core business logic should remain untouched.

---

## Problem

We need an architectural pattern for the backend that can:

- Separate business logic from HTTP handling, database access, and external integrations
- Make each layer independently testable (unit test services without HTTP or database)
- Allow swapping infrastructure (database, email, storage, AI) without rewriting business rules
- Enforce clear responsibilities — controllers don't contain logic, services don't contain SQL
- Scale to 15+ backend modules without becoming a "big ball of mud"
- Support transaction management and complex business workflows (e.g., invoice creation with payment, notification, and audit log)
- Enable new developers to understand where code belongs immediately

Without architectural boundaries, Express route handlers accumulate database queries, business rules, and external API calls in a single function — making testing impossible and refactoring dangerous.

---

## Decision

We will implement **Clean Architecture** on the backend with three distinct layers per module:

```
┌─────────────────────────────────────────┐
│  Controller (Presentation Layer)        │
│  - Parse HTTP request                   │
│  - Call service                         │
│  - Return HTTP response                 │
│  - NO business logic                    │
│  - NO database access                   │
├─────────────────────────────────────────┤
│  Service (Business Logic Layer)         │
│  - Business rules & validation          │
│  - Orchestrate repository calls         │
│  - Manage transactions                  │
│  - NO HTTP knowledge                    │
│  - NO direct Prisma queries             │
├─────────────────────────────────────────┤
│  Repository (Data Access Layer)         │
│  - Prisma queries only                  │
│  - Return raw data models               │
│  - NO business logic                    │
│  - NO HTTP knowledge                    │
└─────────────────────────────────────────┘
```

### File structure per module:

```
modules/[name]/
├── [name].controller.ts    # HTTP in/out
├── [name].service.ts         # Business logic
├── [name].repository.ts      # Database queries
├── [name].routes.ts          # Route definitions + middleware
├── [name].validation.ts      # Zod request schemas
├── [name].types.ts           # Module types
└── index.ts                  # Public exports
```

### Dependency rule:

**Outer layers depend on inner layers. Inner layers never depend on outer layers.**

- Controller → Service → Repository
- Service never imports Express `Request`/`Response`
- Repository never imports business logic

---

## Consequences

### Positive

- **Testability** — services tested with mocked repositories; no HTTP server or database needed
- **Maintainability** — changing Prisma queries only affects repositories; business logic untouched
- **Swappable infrastructure** — replace Stripe with PayPal by changing integration layer, not services
- **Clear responsibilities** — every file has exactly one job; no ambiguity about where code belongs
- **Onboarding** — predictable structure across all 15+ modules
- **Transaction safety** — services orchestrate multi-step operations with proper transaction boundaries

### Negative

- **More files per feature** — 3+ files per module instead of 1 route handler
- **Indirection** — simple CRUD operations require controller → service → repository chain
- **Boilerplate** — thin controllers and repositories can feel verbose for simple endpoints
- **Learning curve** — junior developers may put logic in the wrong layer initially

### Neutral

- Simple CRUD endpoints still follow the pattern for consistency — no exceptions
- Shared utilities (`async-handler`, error classes) reduce boilerplate in controllers

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Fat controllers (logic in routes)** | Untestable; business logic coupled to HTTP; becomes unmaintainable at 15+ modules |
| **Active Record pattern** | Business logic mixed with data access; Prisma models become god objects |
| **Hexagonal Architecture (Ports & Adapters)** | More abstract than needed; Clean Architecture achieves same goals with simpler mental model |
| **CQRS (Command Query Responsibility Segregation)** | Over-engineered for current scale; adds read/write model complexity |
| **Serverless functions (one file per endpoint)** | No layer separation; cold starts; difficult to share business logic across endpoints |

---

## Why This Decision Is Best

Clean Architecture is the right choice for an enterprise backend handling **billing, authentication, and sensitive client data** because it guarantees that business rules are isolated, testable, and protected from infrastructure changes.

When invoice generation involves calculating taxes, applying discounts, creating a Stripe payment intent, sending an email via Resend, and writing an audit log — all of that orchestration belongs in the service layer. The controller receives the request and returns the response. The repository handles the database write. Each layer does one thing.

This separation is not overhead — it is insurance. When we add a new payment provider, integrate a different AI model, or migrate the database, the service layer — where all business rules live — remains unchanged. For a production enterprise application expected to run for years, this architectural discipline pays for itself many times over.
