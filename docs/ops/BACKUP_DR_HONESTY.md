# Backup & Disaster Recovery Honesty (P1-07)

## What EliteFlow application “backup” means

The Settings **backup** API creates a **metadata-only snapshot record** (checksum of a small JSON blob). It is **not** a full PostgreSQL dump and does **not** restore application data by itself.

## What Railway / Postgres owns

- Volume snapshots / provider backups
- Point-in-time recovery (if enabled on the plan)
- Restore of the database volume

EliteFlow does **not** invent RPO/RTO guarantees. Any RPO/RTO claims must come from verified infrastructure configuration.

## DR tests

Security Ops **DR simulation** exercises application readiness checks. Reports are marked `simulationOnly: true`. They are **not** proof of a successful production database restore.

## UI wording

- “Record metadata snapshot” — application metadata row
- “Run DR simulation” — simulated readiness, not live failover
