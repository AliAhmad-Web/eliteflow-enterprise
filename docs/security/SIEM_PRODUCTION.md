# EliteFlow SIEM — Production Activation Guide

## Selected provider

| Field | Value |
|-------|--------|
| **Provider** | **Axiom** (Personal free plan) via EliteFlow `GENERIC_WEBHOOK` |
| **Free tier** | Permanent free Personal plan: **500 GB/mo ingest**, **25 GB storage**, **30-day retention**, no credit card required |
| **Why selected** | Better Stack signup is currently unavailable. Axiom is the next legitimate free HTTPS + Bearer ingest option that fits EliteFlow without a new adapter, Railway upgrade, or extra server |
| **Endpoint type** | HTTPS POST to Axiom ingest API |
| **Authentication** | `Authorization: Bearer <API_TOKEN>` (ingest-scoped API token) |
| **Expected limitations** | Personal plan: 1 user, 3 datasets, 256 fields/dataset, US edge; not a full correlation SIEM — suitable for production security-event export and query |

### Alternatives considered

| Option | Status |
|--------|--------|
| Better Stack Logs | Preferred first choice — **signup temporarily unavailable** (`hello@betterstack.com`) |
| Splunk / Sentinel / QRadar | No suitable ongoing free production tier |
| Datadog | Log ingest not a sustainable free production path |
| Elastic Cloud | Trial/self-host cost |

---

## Architecture (reused — no duplicates)

```
Application events
  → writeAuditLog / securityMonitoringService.report
  → SIEM normalize + redact
  → in-memory queue (retry / DLQ / encrypted offline buffer)
  → circuit breaker + timeout + bounded retries
  → HTTPS GENERIC_WEBHOOK transport (JSON array body)
  → Axiom ingest API (external)
```

**Queue limitation:** SIEM delivery uses an **in-process** queue (not Redis). On multi-instance Railway deploys, each API instance has its own queue/metrics. Delivery remains non-blocking for request paths.

Admin APIs (unchanged):

- `GET  /api/v1/security/siem/status`
- `GET  /api/v1/security/siem/config`
- `POST /api/v1/security/siem/test`
- `POST /api/v1/security/siem/export`
- `POST /api/v1/security/siem/retry`

RBAC: **Admin / Super Admin** only.

---

## Event schema (normalized)

Outbound body is a **JSON array** of events. Each event includes (after redaction):

- `eventId`, `timestamp` / `dt`, `severity` / `level`, `category`, `eventType`
- `resource`, `action`, `result`, `userId`, `tenantId`, `ipAddress`
- `correlationId`, `metadata` (redacted), `message`, `source`

**Never transmitted:** passwords, JWTs, access/refresh tokens, API keys, OAuth client secrets, Supabase service-role keys, encryption keys, reCAPTCHA secrets, SMTP passwords, SIEM credentials, cookies, session secrets.

---

## Required credentials (user must create)

Do **not** commit these values. Set them only in Railway Production secrets.

1. Create a free Axiom Personal account: https://app.axiom.co/register (or https://axiom.co)  
2. Prefer creating a dedicated dataset `eliteflow-siem` in the Axiom UI (Datasets → New).  
   - If the ingest token cannot create datasets via API, create the dataset in the console first.  
   - **Current production fallback:** writable org dataset `axiom-audit` (verified ingest). Shared demo datasets (`sample-http-logs`, etc.) reject ingest.  
3. **Settings → API tokens → New API token**  
   - Type: **Basic** (ingest)  
   - Dataset access: grant the target dataset only  
4. Copy the API token once (it will not be shown again)

**Endpoint format (US East edge — Personal plan):**

```text
https://us-east-1.aws.edge.axiom.co/v1/ingest/<DATASET>?timestamp-field=timestamp
```

Production currently uses `<DATASET>=axiom-audit` until a dedicated `eliteflow-siem` dataset is created and the endpoint variable is updated.

---

## Railway Production variables

Set **only** these on the API service (Production):

```text
SECURITY_SIEM_ENABLED=true
SIEM_PROVIDERS=GENERIC_WEBHOOK
SIEM_GENERIC_WEBHOOK_ENDPOINT=https://us-east-1.aws.edge.axiom.co/v1/ingest/axiom-audit?timestamp-field=timestamp
SIEM_GENERIC_WEBHOOK_AUTH_MODE=BEARER
SIEM_GENERIC_WEBHOOK_BEARER_TOKEN=<AXIOM_API_TOKEN>
SIEM_REQUEST_TIMEOUT_MS=10000
SIEM_MAX_RETRIES=5
SIEM_BASE_BACKOFF_MS=1000
SIEM_MAX_BACKOFF_MS=60000
```

> Prefer switching the endpoint path to `/v1/ingest/eliteflow-siem` after creating that dataset in the Axiom UI.

Optional:

```text
SIEM_TENANT_ID=<your-org-or-tenant-id>
SIEM_FLUSH_INTERVAL_MS=5000
```

**Do not** set any `NEXT_PUBLIC_*` SIEM variables.  
**Do not** put tokens in Git, `.env` committed files, or frontend code.

---

## Enable / disable / rotate

| Action | How |
|--------|-----|
| **Disable SIEM** | Set `SECURITY_SIEM_ENABLED=false` (or unset) and redeploy API |
| **Rotate token** | Create new Axiom ingest token → update `SIEM_GENERIC_WEBHOOK_BEARER_TOKEN` → redeploy → revoke old token |
| **Change dataset** | Update `SIEM_GENERIC_WEBHOOK_ENDPOINT` path → redeploy |

---

## Test procedure

1. Deploy API with variables above; confirm `GET /api/v1/health` → 200.  
2. As Admin: Security Center → **Send Test Event** (`POST /api/v1/security/siem/test`).  
3. In Axiom, open dataset `eliteflow-siem` / Stream and confirm event with `isTest: true` / `eventType: SIEM_CONNECTIVITY_TEST`.  
4. Trigger a real security action (e.g. admin audit view or login) and confirm it appears.  
5. Confirm status UI: enabled, connection, providers, queue, failures, DLQ — **no secrets**.

Local verification script (no production delivery):

```bash
cd apps/api && npx tsx scripts/verify-siem.ts
```

---

## Failure / retry behavior

- Request timeout (`SIEM_REQUEST_TIMEOUT_MS`)
- Bounded retries (`SIEM_MAX_RETRIES`) with exponential backoff
- Circuit breaker per provider
- Dead-letter queue after max retries
- Queue full → encrypted offline buffer
- Provider down → no app crash; request path remains non-blocking

---

## Security considerations

- Outbound TLS required for non-loopback endpoints  
- Config/status APIs redact credentials and path segments  
- Audit + SIEM redaction layers strip secrets before enqueue  
- Admin-only SIEM ops; non-admins receive 403  
