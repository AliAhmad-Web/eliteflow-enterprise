# @enterprise/database

PostgreSQL database package for the Enterprise Business Management application.

## Stack

- **PostgreSQL** — primary database (local or Supabase-hosted)
- **Prisma ORM** — schema, migrations, type-safe client
- **Supabase** — managed PostgreSQL hosting in production
- **UUID** — native PostgreSQL primary keys (`gen_random_uuid()`)

## Structure

```
packages/database/
├── prisma/
│   ├── schema.prisma              # Generator + datasource
│   ├── schema/
│   │   ├── enums.prisma           # Auth enums
│   │   ├── user.prisma            # User, Role, Permission, RolePermission
│   │   ├── auth.prisma            # Session, tokens, OAuth, OTP
│   │   └── audit.prisma           # AuditLog, LoginAttempt
│   ├── migrations/
│   └── seed/
├── src/
│   ├── client.ts                  # Prisma singleton
│   ├── index.ts                   # Package exports
│   └── generated/client/          # Generated Prisma Client
└── package.json
```

## Setup

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Update DATABASE_URL for your PostgreSQL / Supabase instance

# 3. Install dependencies
npm install

# 4. Generate Prisma Client
npm run generate

# 5. Apply migrations
npm run migrate:deploy

# 6. Seed roles, permissions, and demo users
#    Required after UUID migration if auth tables were previously populated
npm run seed
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run generate` | Generate Prisma Client |
| `npm run validate` | Validate schema |
| `npm run migrate:dev` | Create/apply migrations (development) |
| `npm run migrate:deploy` | Apply migrations (production/CI) |
| `npm run seed` | Seed roles, permissions, demo users |
| `npm run studio` | Open Prisma Studio |

## Supabase Notes

- Use the **direct connection** (port `5432`) for `DATABASE_URL` when running migrations.
- Use the **pooled connection** (port `6543`) for application runtime if desired.
- Prisma is the sole data access layer; Supabase Auth is used separately for OAuth.

## Demo Users (Development Seed)

| Email | Role | Password |
|-------|------|----------|
| `superadmin@eliteflow.dev` | Super Admin | `Password123!` |
| `admin@eliteflow.dev` | Admin | `Password123!` |
| `employee@eliteflow.dev` | Employee | `Password123!` |
| `client@eliteflow.dev` | Client | `Password123!` |

Override via `SEED_DEMO_PASSWORD` in `.env`.

## Migrations

| Migration | Description |
|-----------|-------------|
| `20260722140000_init_authentication` | Initial auth schema (TEXT/CUID era) |
| `20260722150000_uuid_and_user_security_fields` | UUID PKs, user security fields, index optimization |

See `docs/database/uuid-migration-review.md` for UUID migration rationale and data impact.
