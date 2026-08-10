# Database Capacity Safety (P1-01)

**Status:** Guidance only — **no destructive application cleanup**  
**Date:** 2026-08-10  
**Scope:** Production PostgreSQL on Railway (trial volume historically capped at **500 MB**)

## Non-negotiables

1. Do **not** delete business data, audit/compliance records, migrations, or production relations to free disk.
2. Do **not** run automatic destructive cleanup from the application to “fix” capacity.
3. Application retention jobs must **not** purge compliance-retained audit logs (see P1-10 / `AUDIT_LOGS` policy).
4. A Railway **plan upgrade** and **volume Live Resize** are **infrastructure** actions. They are **not** solvable by deleting production data in EliteFlow.

## What fills the volume (observed)

| Area | Nature | Action |
|------|--------|--------|
| `base` / application tables | Business + auth + files metadata | **Retain** — capacity via resize/upgrade |
| WAL / checkpoints | Ephemeral Postgres internals | Ops-only; never delete WAL aggressively |
| Revoked sessions / expired refresh tokens | Ephemeral auth artifacts | Safe to expire via existing session cleanup |
| Rate-limit / cache keys in Redis | Ephemeral | Redis TTL — not Postgres |
| Leave workflow stage cache (Redis) | Cache only | Postgres is source of truth (P1-02) |
| Audit logs | Compliance (≈7 years, no auto-delete) | **Never** purge via session cleanup |

## Safe ephemeral candidates (retain/expire only)

These may be **expired** by existing jobs — they are **not** business master data:

- Idle / absolutely expired **sessions**
- Expired **refresh tokens**
- **Revoked** sessions past `REVOKED_SESSION_RETENTION_DAYS`
- Soft-deleted rows already past product soft-delete windows (only if a dedicated retention job already defines them)

**Not ephemeral:** invoices, projects, tasks, files metadata, clients, HR leave requests, audit hash-chain rows, security incidents, role/permission data.

## Application vs Railway operations

| Layer | Responsibility |
|-------|----------------|
| **EliteFlow API** | Non-destructive retention guidance; durable leave workflow; audit retention = no auto-delete |
| **Railway Postgres** | Disk quota, volume size, backups/snapshots, plan limits |
| **Ops** | Upgrade plan → Live Resize volume → monitor `pg_database_size` / volume metrics |

## Recommended production checks (read-only)

```sql
-- Overall DB size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Largest relations (read-only)
SELECT relname, pg_size_pretty(pg_total_relation_size(c.oid)) AS total
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 25;
```

## Production capacity guidance

1. If volume utilization is high on a **trial 500 MB** cap: **upgrade Railway + resize** before traffic growth.
2. After resize, re-check free space and WAL health; do not reclaim space by deleting audit/business rows.
3. Application deploys must continue to apply Prisma migrations; migrations are not “bloat to delete.”
4. Full database backup/restore remains a **Railway/Postgres infrastructure** responsibility (see P1-07 honesty docs).

## STOP condition

If production cannot run because the volume is full and upgrade/resize cannot be performed: **stop claiming application-level capacity remediation** and escalate infrastructure upgrade. Do not authorize destructive data deletion.
