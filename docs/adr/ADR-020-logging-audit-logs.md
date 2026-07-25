# ADR-020: Why Logging & Audit Logs

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application is an enterprise platform handling sensitive business operations: client data management, financial invoicing with Stripe payments, team management, file storage, AI document generation, and role-based access control. The application must be observable in production and compliant with enterprise accountability requirements.

The project plan (Phase 17 — Security) explicitly requires audit logs. Enterprise customers expect visibility into who did what, when, and from where — especially for financial transactions, permission changes, and data access.

---

## Problem

We need a logging and audit system that can:

- Record all security-relevant actions (login, logout, permission changes, role assignments)
- Track data mutations (client created, invoice sent, project deleted, file uploaded)
- Provide structured logs for production debugging and monitoring
- Support log levels (error, warn, info, debug) with environment-appropriate defaults
- Enable audit trail queries ("who deleted client X on date Y?")
- Capture request context (user ID, IP address, user agent, timestamp)
- Not log sensitive data (passwords, tokens, credit card numbers)
- Scale without impacting API response times
- Integrate with future monitoring tools (Datadog, Sentry, CloudWatch)
- Meet enterprise compliance expectations for data access accountability

Console.log statements scattered across the codebase are not searchable, not structured, and disappear in production. Enterprise customers cannot accept "we don't know who changed that invoice."

---

## Decision

We will implement a **two-tier logging system**: structured application logging and a dedicated audit log system.

### Tier 1: Application Logging (Operational)

**Purpose:** Debugging, error tracking, performance monitoring.

| Aspect | Decision |
|--------|----------|
| **Library** | Custom logger wrapper in `apps/api/src/shared/utils/logger.ts` |
| **Format** | Structured JSON in production; pretty-print in development |
| **Levels** | `error`, `warn`, `info`, `debug` |
| **Default level** | `info` in production; `debug` in development |
| **Request logging** | `logger.middleware.ts` logs method, path, status, duration |
| **Error logging** | `error.middleware.ts` logs full error with stack trace |
| **Sensitive data** | Never log passwords, tokens, API keys, or PII in application logs |

### Tier 2: Audit Logs (Compliance)

**Purpose:** Accountability, compliance, security investigations.

| Aspect | Decision |
|--------|----------|
| **Storage** | PostgreSQL `AuditLog` table via Prisma |
| **Scope** | All security and data mutation events |
| **Fields** | `id`, `userId`, `action`, `resource`, `resourceId`, `metadata`, `ipAddress`, `userAgent`, `createdAt` |
| **Write method** | Service layer calls `auditLog.service.ts` after successful mutations |
| **Read access** | Super Admin and Admin only |
| **Retention** | Configurable; default 2 years |
| **Performance** | Async write; does not block API response |

### Audited actions:

| Category | Actions |
|----------|---------|
| **Authentication** | `auth.login`, `auth.logout`, `auth.failed_login`, `auth.password_reset` |
| **Users** | `user.created`, `user.updated`, `user.deleted`, `user.role_changed` |
| **Clients** | `client.created`, `client.updated`, `client.deleted` |
| **Projects** | `project.created`, `project.updated`, `project.deleted`, `project.status_changed` |
| **Invoices** | `invoice.created`, `invoice.sent`, `invoice.paid`, `invoice.cancelled` |
| **Files** | `file.uploaded`, `file.deleted`, `file.shared` |
| **Settings** | `settings.updated`, `permission.changed` |
| **AI** | `ai.document_generated`, `ai.query_executed` |

### Audit log schema:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // e.g., "client.created"
  resource   String   // e.g., "client"
  resourceId String?  // e.g., "clt_abc123"
  metadata   Json?    // e.g., { "previousStatus": "draft", "newStatus": "sent" }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([action])
  @@index([resource, resourceId])
  @@index([createdAt])
}
```

### Implementation locations:

```
apps/api/src/
├── shared/utils/logger.ts              # Application logger
├── middleware/logger.middleware.ts     # Request logging
├── middleware/error.middleware.ts      # Error logging
├── modules/audit-log/
│   ├── audit-log.service.ts            # Write audit entries
│   ├── audit-log.repository.ts         # Prisma queries
│   ├── audit-log.controller.ts         # Read audit entries (admin)
│   └── audit-log.routes.ts             # GET /api/v1/audit-logs
```

### Frontend audit log viewer:

- Super Admin / Admin can view audit logs in Settings or dedicated Reports section
- Filterable by user, action, resource, date range
- Read-only — audit logs are immutable

---

## Consequences

### Positive

- **Accountability** — every data mutation traceable to a specific user
- **Security investigations** — failed logins, permission changes, and suspicious activity logged
- **Compliance** — enterprise customers can audit who accessed their data
- **Debugging** — structured application logs searchable in production monitoring tools
- **Immutable audit trail** — audit logs are append-only; no update or delete
- **Performance** — async audit writes do not slow API responses
- **Future integration** — JSON logs compatible with Datadog, Sentry, ELK stack

### Negative

- **Storage growth** — audit logs accumulate over time; retention policy and archiving needed
- **Implementation overhead** — every mutation service must call audit log service
- **PII considerations** — audit metadata must not contain sensitive data (passwords, card numbers)
- **Query performance** — large audit tables require proper indexing (addressed in schema)

### Neutral

- Application logs and audit logs serve different purposes and are stored differently
- Audit log viewer is an admin-only feature, not exposed to Employee or Client roles

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **console.log only** | Not structured; not searchable; lost in production; no audit capability |
| **Winston/Pino only (no audit table)** | Good for application logs but no compliance-grade audit trail |
| **External audit service (AWS CloudTrail)** | Overkill for application-level events; additional cost and complexity |
| **Event sourcing** | Full event sourcing is over-engineered; audit log table achieves compliance needs |
| **Log files on disk** | Not queryable; lost on container restart; no structured search |
| **No audit logs** | Unacceptable for enterprise app with billing and client data |

---

## Why This Decision Is Best

Logging and audit logs serve different purposes and both are essential for an enterprise application. **Application logs** help developers debug production issues. **Audit logs** help administrators and compliance officers answer "who did what."

For a platform handling **invoicing, client data, and role-based access**, the audit trail is not optional. When a client disputes an invoice modification, the admin must be able to see who changed it and when. When a Super Admin investigates a security incident, failed login attempts and permission changes must be queryable.

The two-tier approach keeps concerns separated: the logger handles operational debugging with appropriate log levels and formatting, while the audit log table provides an immutable, queryable record of business-critical actions. The audit log schema with proper indexes ensures performant queries even with millions of entries.

Async audit writes ensure that compliance logging never degrades user experience. The API responds immediately; the audit entry is written in the background. This is the standard pattern for enterprise audit systems and balances accountability with performance.
