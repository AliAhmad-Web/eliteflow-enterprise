# Enterprise Git Workflow

> **Project:** Enterprise Business Management Web Application  
> **Repository Type:** Monorepo (`apps/web`, `apps/api`, `packages/*`)  
> **Version:** 1.0  
> **Last Updated:** 2026-07-22

---

## Table of Contents

1. [Git Branch Strategy](#1-git-branch-strategy)
2. [Branch Naming Rules](#2-branch-naming-rules)
3. [Commit Message Convention](#3-commit-message-convention)
4. [Pull Request Rules](#4-pull-request-rules)
5. [Code Review Checklist](#5-code-review-checklist)
6. [Merge Strategy](#6-merge-strategy)
7. [Release Workflow](#7-release-workflow)
8. [Versioning Strategy](#8-versioning-strategy-semantic-versioning)
9. [Git Ignore Strategy](#9-git-ignore-strategy)
10. [Folder Protection Rules](#10-folder-protection-rules)
11. [Code Ownership](#11-code-ownership)
12. [Development Workflow](#12-development-workflow)
13. [Best Practices](#13-best-practices)
14. [Common Mistakes to Avoid](#14-common-mistakes-to-avoid)
15. [Enterprise Development Rules](#15-enterprise-development-rules)

---

## 1. Git Branch Strategy

We follow a **modified Git Flow** optimized for a monorepo with continuous delivery. This strategy balances stability, parallel development, and fast production fixes.

### Branch Overview

```
main ─────────────────────────────────────────────── Production
  │
  ├── hotfix/* ──────────────────────────────────── Emergency fixes
  │
  ├── release/* ─────────────────────────────────── Release preparation
  │
develop ─────────────────────────────────────────── Integration
  │
  ├── feature/* ─────────────────────────────────── New features
  │
  └── fix/* ───────────────────────────────────── Bug fixes
```

### Branch Definitions

| Branch | Purpose | Created From | Merged Into | Lifetime |
|--------|---------|--------------|-------------|----------|
| `main` | Production-ready code. Always deployable. | — | — | Permanent |
| `develop` | Integration branch for all ongoing work. | `main` | `release/*` | Permanent |
| `feature/*` | New features, modules, enhancements | `develop` | `develop` | Temporary (delete after merge) |
| `fix/*` | Non-critical bug fixes | `develop` | `develop` | Temporary (delete after merge) |
| `hotfix/*` | Critical production bugs requiring immediate fix | `main` | `main` + `develop` | Temporary (delete after merge) |
| `release/*` | Release preparation, final testing, version bump | `develop` | `main` + `develop` | Temporary (delete after merge) |

### Branch Rules

#### `main`

- Reflects **production** state at all times
- Every commit on `main` is tagged with a semantic version (`v1.2.0`)
- **No direct commits** — only merges from `release/*` or `hotfix/*`
- Protected branch — requires PR approval and passing CI
- Auto-deploys to production on merge

#### `develop`

- Default integration branch for all developers
- Contains the latest completed features and fixes
- **No direct commits** — only merges from `feature/*`, `fix/*`, `release/*`, and `hotfix/*`
- Protected branch — requires PR approval and passing CI
- Auto-deploys to staging environment on merge

#### `feature/*`

- One branch per feature, module, or enhancement
- Branch from `develop`, merge back to `develop`
- Must be up to date with `develop` before PR
- Deleted after successful merge

#### `fix/*`

- One branch per non-critical bug fix
- Branch from `develop`, merge back to `develop`
- Used for bugs found in development or staging — not production emergencies

#### `hotfix/*`

- For critical production bugs only
- Branch from `main`, merge to both `main` AND `develop`
- Bypasses normal release cycle
- Requires Tech Lead approval
- Tagged immediately after merge to `main`

#### `release/*`

- Created when `develop` is ready for production release
- Only bug fixes and version bumps allowed — no new features
- Branch from `develop`, merge to `main` AND back to `develop`
- Named with version: `release/v1.2.0`

### Visual Flow

```
feature/clients-module ──┐
feature/invoices-api  ───┼──→ develop ──→ release/v1.0.0 ──→ main (v1.0.0)
fix/login-validation  ───┘         ↑                              │
                                     │                              │
                              hotfix/payment-crash ────────────────┘
                                                              (v1.0.1)
```

---

## 2. Branch Naming Rules

### Format

```
<type>/<ticket-id>-<short-description>
```

### Rules

| Rule | Example | Anti-Pattern |
|------|---------|--------------|
| Use lowercase only | `feature/clients-module` | `Feature/Clients-Module` |
| Use hyphens, not underscores | `feature/ai-assistant` | `feature/ai_assistant` |
| Keep description short (3–5 words) | `fix/invoice-pdf-export` | `fix/fix-the-bug-in-invoice-pdf-export-when-client-has-no-address` |
| Include ticket ID when available | `feature/EBM-142-client-crud` | `feature/client-stuff` |
| Use correct type prefix | `hotfix/payment-timeout` | `fix/payment-timeout` (for production emergencies) |
| No special characters | `feature/file-manager` | `feature/file@manager!` |
| No personal names | `feature/dashboard-charts` | `feature/ali-dashboard` |

### Valid Examples

```
feature/EBM-101-auth-module
feature/EBM-142-client-management
feature/EBM-200-dashboard-ui
feature/invoice-pdf-export
feature/ai-assistant-chat
feature/team-management
fix/EBM-305-login-redirect
fix/invoice-tax-calculation
fix/date-picker-timezone
hotfix/EBM-999-payment-crash
hotfix/stripe-webhook-failure
release/v1.0.0
release/v1.1.0
release/v2.0.0
```

### Invalid Examples

```
feature/ClientManagement          ❌ PascalCase
feature/new_feature                 ❌ Underscores
fix/bug                             ❌ Too vague
ali/dashboard-work                  ❌ Personal name, no type prefix
FEATURE/auth                        ❌ Uppercase type
feature/EBM-142                     ❌ Missing description
```

### Monorepo Scope Prefixes (Optional)

When a branch affects a specific app or package, include scope in the description:

```
feature/web-dashboard-layout        # Frontend only
feature/api-invoice-endpoints       # Backend only
feature/shared-client-schemas       # Shared package only
feature/EBM-150-full-client-crud    # Cross-layer (web + api + shared)
```

---

## 3. Commit Message Convention

We use **[Conventional Commits](https://www.conventionalcommits.org/)** for all commit messages. This enables automated changelog generation, semantic versioning, and clear git history.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Purpose | Version Bump |
|------|---------|-------------|
| `feat` | New feature or module | Minor (`1.0.0` → `1.1.0`) |
| `fix` | Bug fix | Patch (`1.0.0` → `1.0.1`) |
| `refactor` | Code restructuring without behavior change | None |
| `docs` | Documentation only | None |
| `style` | Formatting, whitespace, semicolons (no logic change) | None |
| `test` | Adding or updating tests | None |
| `build` | Build system, dependencies, tooling | None |
| `ci` | CI/CD pipeline changes | None |
| `perf` | Performance improvement | Patch |
| `chore` | Maintenance tasks (configs, scripts) | None |
| `revert` | Revert a previous commit | Depends on reverted commit |

### Scopes

Scopes identify which part of the monorepo is affected:

| Scope | Area |
|-------|------|
| `web` | `apps/web` — Next.js frontend |
| `api` | `apps/api` — Express backend |
| `shared` | `packages/shared` — types, schemas, constants |
| `database` | `packages/database` — Prisma schema, migrations |
| `config` | `packages/config` — environment validation |
| `auth` | Authentication module (cross-layer) |
| `clients` | Client management module |
| `projects` | Project management module |
| `invoices` | Invoice & billing module |
| `ui` | Shared UI components |
| `deps` | Dependency updates |
| `ci` | CI/CD pipeline |
| `docs` | Documentation |

### Rules

1. **Subject line** — max 72 characters, imperative mood ("add" not "added")
2. **No period** at the end of the subject line
3. **Body** — explain *what* and *why*, not *how* (the code shows how)
4. **Footer** — reference issue/ticket: `Closes EBM-142` or `BREAKING CHANGE: description`
5. **One logical change per commit** — do not mix unrelated changes

### Examples

#### `feat` — New Features

```
feat(auth): add Google OAuth login integration

Implement Google OAuth flow using Supabase Auth.
Backend issues JWT after successful OAuth callback.

Closes EBM-101
```

```
feat(clients): add client CRUD API endpoints

Add create, read, update, delete endpoints for client management.
Includes Zod validation and RBAC permission checks.

Closes EBM-142
```

```
feat(web): add dashboard revenue overview chart

Implement area chart component using Recharts.
Displays monthly revenue with tooltip and gradient fill.
```

```
feat(invoices): add PDF export for invoices

Generate invoice PDF using server-side template.
Includes company logo, line items, tax, and total.
```

```
feat(ai): add AI assistant chat widget

Add right-panel AI assistant with quick action buttons.
Integrates with OpenAI API via backend proxy.
```

#### `fix` — Bug Fixes

```
fix(auth): resolve token refresh race condition

Prevent multiple simultaneous refresh requests from
invalidating each other's tokens.

Fixes EBM-305
```

```
fix(invoices): correct tax calculation for discounted items

Tax was calculated on pre-discount amount.
Now applies discount before tax calculation.

Fixes EBM-412
```

```
fix(web): fix sidebar collapse on mobile viewport

Sidebar was not closing after navigation on mobile.
Added close handler to mobile nav link clicks.
```

#### `refactor` — Code Restructuring

```
refactor(api): extract invoice service into repository pattern

Move Prisma queries from invoice.service.ts to
invoice.repository.ts following Clean Architecture.

No behavior change.
```

```
refactor(web): migrate client list to feature-based structure

Move client components from pages/ to features/clients/.
Update imports across affected files.
```

#### `docs` — Documentation

```
docs: add ADR-014 JWT refresh token decision record
```

```
docs(api): update client endpoints documentation

Add request/response examples for all CRUD operations.
Document required permissions for each endpoint.
```

```
docs: add git workflow guide for development team
```

#### `style` — Formatting

```
style(web): apply Prettier formatting to dashboard components
```

```
style(api): fix ESLint warnings in auth module
```

#### `test` — Tests

```
test(clients): add unit tests for client service

Cover create, update, delete, and validation edge cases.
Mock repository layer for isolated service testing.
```

```
test(api): add integration tests for auth endpoints

Test login, signup, token refresh, and logout flows.
Use test database with seed data.
```

#### `build` — Build System

```
build(deps): upgrade Next.js to 15.1.0
```

```
build: configure Turborepo pipeline for monorepo builds

Add build, lint, test, and type-check tasks.
Enable remote caching for CI.
```

#### `ci` — CI/CD

```
ci: add GitHub Actions workflow for pull request checks

Run lint, type-check, and test on every PR.
Block merge if any check fails.
```

```
ci: add Vercel preview deployment for web app
```

#### `perf` — Performance

```
perf(web): implement lazy loading for dashboard charts

Defer chart component loading with dynamic imports.
Reduces initial bundle size by 45KB.
```

```
perf(api): add database indexes for audit log queries

Add composite index on (resource, resourceId, createdAt).
Improves audit log search performance by 10x.
```

#### `chore` — Maintenance

```
chore: update .env.example with new Stripe variables
```

```
chore(database): add seed data for development environment
```

```
chore(deps): update Prisma to 6.0.0
```

#### Breaking Changes

```
feat(auth)!: change JWT payload structure

BREAKING CHANGE: JWT payload now uses `permissions` array
instead of `role` string. All API consumers must update
token parsing logic. Frontend auth store updated accordingly.

Closes EBM-500
```

### Commit Message Template

```
# <type>(<scope>): <subject>
#
# [Why is this change needed?]
#
# [What does this change do?]
#
# Closes EBM-<ticket-number>
# BREAKING CHANGE: <description if applicable>
```

---

## 4. Pull Request Rules

### PR Creation Rules

| Rule | Requirement |
|------|-------------|
| **Branch** | Must branch from `develop` (or `main` for hotfix) |
| **Up to date** | Must be rebased/merged with target branch before review |
| **One concern per PR** | One feature, one fix, or one refactor — not mixed |
| **Size** | Max 400 lines changed (excluding generated files). Split larger PRs. |
| **CI passing** | All checks must pass before review |
| **No WIP** | Do not request review on work-in-progress PRs |
| **Draft PRs** | Use GitHub Draft PR for early feedback, mark Ready when complete |
| **Linked ticket** | PR must reference a ticket/issue number |
| **Description** | Must use the PR template (see below) |
| **Screenshots** | Required for UI changes (before/after) |
| **Migration notice** | Required if PR includes database migrations |

### PR Title Format

Follow the same Conventional Commits format as commit messages:

```
feat(clients): add client management module
fix(auth): resolve token refresh race condition
refactor(api): extract repository pattern for invoices
```

### PR Description Template

```markdown
## Summary
Brief description of what this PR does and why.

## Type of Change
- [ ] feat — New feature
- [ ] fix — Bug fix
- [ ] refactor — Code restructuring
- [ ] docs — Documentation
- [ ] test — Tests
- [ ] chore — Maintenance

## Changes
- Change 1
- Change 2
- Change 3

## Screenshots (if UI changes)
| Before | After |
|--------|-------|
| image  | image |

## Test Plan
- [ ] Test step 1
- [ ] Test step 2
- [ ] Test step 3

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] No `console.log` or debug code
- [ ] No secrets or credentials committed
- [ ] Types are strict (no `any`)
- [ ] Zod schemas updated if API contracts changed
- [ ] Shared package updated if types/schemas changed
- [ ] Database migration included (if applicable)
- [ ] Documentation updated (if applicable)

## Related
Closes EBM-<ticket-number>
```

### PR Review Requirements

| Target Branch | Required Approvals | Required Checks |
|---------------|-------------------|-----------------|
| `develop` | 1 approval | Lint, Type-check, Test |
| `main` (via release) | 2 approvals (1 must be Tech Lead) | Lint, Type-check, Test, Build |
| `main` (via hotfix) | 2 approvals (1 must be Tech Lead) | Lint, Type-check, Test |

### PR Lifecycle

```
Draft PR → Ready for Review → Changes Requested → Approved → Merged → Branch Deleted
                                    ↑                    │
                                    └────────────────────┘
                                      (author fixes)
```

---

## 5. Code Review Checklist

### Architecture & Structure

- [ ] Code follows feature-based folder structure (`features/`, `modules/`)
- [ ] Clean Architecture layers respected (Controller → Service → Repository)
- [ ] No business logic in controllers or route handlers
- [ ] No direct Prisma queries outside repository files
- [ ] Shared types/schemas in `packages/shared`, not duplicated
- [ ] Feature imports only via `index.ts` barrel exports
- [ ] No circular dependencies between features or packages

### TypeScript & Code Quality

- [ ] Strict TypeScript — no `any` types
- [ ] Exhaustive switch with `never` check for union types
- [ ] Proper error handling — no swallowed errors
- [ ] No `console.log` — use structured logger
- [ ] No commented-out code
- [ ] No TODO comments without a linked ticket
- [ ] Functions are focused — single responsibility
- [ ] No magic strings — use constants from `constants/`

### Security

- [ ] No secrets, API keys, or credentials in code
- [ ] Input validated with Zod schemas (frontend and backend)
- [ ] RBAC permissions checked on API endpoints
- [ ] No sensitive data in logs or audit entries
- [ ] SQL injection prevented (Prisma parameterized queries only)
- [ ] XSS prevented (no `dangerouslySetInnerHTML` without sanitization)
- [ ] File uploads validated (type, size, extension)

### Frontend (apps/web)

- [ ] Components follow ui → common → features hierarchy
- [ ] No duplicate components — reuse from `components/`
- [ ] Server Components by default; Client Components only when needed
- [ ] TanStack Query for server state; Zustand for UI state only
- [ ] React Hook Form + Zod for all forms
- [ ] All four UI states handled: loading, empty, error, success
- [ ] Responsive design tested (desktop, tablet, mobile)
- [ ] Dark and light theme tested
- [ ] No inline imports — all imports at top of file

### Backend (apps/api)

- [ ] API endpoints versioned under `/api/v1/`
- [ ] Request validation middleware applied
- [ ] Auth middleware applied to protected routes
- [ ] Role/permission middleware applied where needed
- [ ] Audit log entries for data mutations
- [ ] Proper HTTP status codes used
- [ ] Error responses follow standard format
- [ ] Pagination implemented for list endpoints

### Database

- [ ] Prisma migration included for schema changes
- [ ] Migration is reversible or downgrade documented
- [ ] Indexes added for frequently queried columns
- [ ] No raw SQL unless justified and documented
- [ ] Seed data updated if schema changes affect seeds

### Testing

- [ ] Unit tests for service layer business logic
- [ ] Integration tests for API endpoints (if applicable)
- [ ] Edge cases covered (empty data, invalid input, unauthorized access)
- [ ] Tests pass locally before PR submission

### Documentation

- [ ] API documentation updated for new/changed endpoints
- [ ] ADR created for significant architectural decisions
- [ ] README updated if setup steps changed
- [ ] Environment variables documented in `.env.example`

---

## 6. Merge Strategy

### Strategy by Branch Type

| Merge Into | Strategy | Reason |
|-----------|----------|--------|
| `develop` ← `feature/*` | **Squash and Merge** | Clean history; one commit per feature |
| `develop` ← `fix/*` | **Squash and Merge** | Clean history; one commit per fix |
| `main` ← `release/*` | **Merge Commit** | Preserve release history |
| `main` ← `hotfix/*` | **Merge Commit** | Preserve hotfix context |
| `develop` ← `release/*` | **Merge Commit** | Sync release changes back |
| `develop` ← `hotfix/*` | **Merge Commit** | Sync hotfix back to develop |

### Squash and Merge (Default for Features)

- All commits in the PR are squashed into a single commit on the target branch
- The squashed commit message follows Conventional Commits format
- PR title becomes the squash commit message
- Results in a clean, linear history on `develop`

```
feature/clients-module commits:
  ├── "wip: start client form"
  ├── "add validation"
  ├── "fix typo"
  └── "address review comments"

After squash → develop:
  └── "feat(clients): add client management module"
```

### Merge Commit (Releases and Hotfixes)

- Creates a merge commit preserving full branch history
- Used when the branch history itself has value (release trail, hotfix context)
- Merge commit message: `Merge release/v1.2.0 into main`

### Rebase (Before PR — Not for Merge)

- Developers rebase their feature branch onto latest `develop` before creating/updating PR
- Keeps feature branch history clean
- **Never rebase shared branches** (`main`, `develop`)

```
# Before creating PR
git checkout develop
git pull origin develop
git checkout feature/clients-module
git rebase develop
git push --force-with-lease origin feature/clients-module
```

### Forbidden Merge Practices

| Practice | Why Forbidden |
|----------|--------------|
| Force push to `main` or `develop` | Destroys shared history |
| Merge `main` into feature branches | Use rebase instead |
| Merge without CI passing | Broken code enters shared branches |
| Self-merge without approval | Bypasses code review |
| `--no-verify` to skip hooks | Bypasses quality gates |

---

## 7. Release Workflow

### Release Cycle

```
develop (feature complete)
  │
  ├── Create release/v1.2.0 branch
  │
  ├── QA testing on release branch
  │     ├── Bug found → fix on release branch
  │     └── All tests pass
  │
  ├── Bump version in package.json files
  ├── Update CHANGELOG.md
  ├── Merge release/v1.2.0 → main
  ├── Tag main as v1.2.0
  ├── Merge release/v1.2.0 → develop
  ├── Delete release/v1.2.0 branch
  │
  └── Production deployment triggered by tag
```

### Step-by-Step Release Process

#### 1. Create Release Branch

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0
git push -u origin release/v1.2.0
```

#### 2. Prepare Release

- Run full test suite on release branch
- Fix any bugs found (commit directly on release branch)
- Update version in all `package.json` files
- Update `CHANGELOG.md` with release notes
- Verify all environment variables documented

#### 3. Merge to Main

```bash
# Create PR: release/v1.2.0 → main
# Requires 2 approvals (1 Tech Lead)
# After approval and merge:
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

#### 4. Sync Back to Develop

```bash
# Create PR: release/v1.2.0 → develop
# Merge after main merge is complete
# Delete release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

#### 5. Deploy

- Production deployment triggered automatically by `v*` tag push
- Verify deployment health checks pass
- Monitor error rates for 30 minutes post-deploy

### Hotfix Release Process

For critical production bugs that cannot wait for the next release cycle:

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/EBM-999-payment-crash

# 2. Fix the bug, commit
git commit -m "fix(invoices): resolve payment processing crash on zero-amount invoices"

# 3. PR to main (requires Tech Lead approval)
# 4. After merge, tag immediately
git tag -a v1.2.1 -m "Hotfix v1.2.1 — payment crash fix"
git push origin v1.2.1

# 5. Merge hotfix back to develop
# PR: hotfix/EBM-999-payment-crash → develop
```

### CHANGELOG Format

```markdown
# Changelog

## [1.2.0] - 2026-08-15

### Added
- Client management module with CRUD operations (EBM-142)
- Dashboard revenue overview chart (EBM-200)
- AI assistant chat widget (EBM-180)

### Fixed
- Token refresh race condition (EBM-305)
- Invoice tax calculation for discounted items (EBM-412)

### Changed
- Upgraded Next.js to 15.1.0
- Migrated client list to feature-based structure

## [1.1.0] - 2026-07-01
...
```

---

## 8. Versioning Strategy (Semantic Versioning)

We follow **[Semantic Versioning 2.0.0](https://semver.org/)** (SemVer).

### Format

```
MAJOR.MINOR.PATCH
  │      │      │
  │      │      └── Bug fixes (backwards compatible)
  │      └───────── New features (backwards compatible)
  └──────────────── Breaking changes
```

### Version Bump Rules

| Change Type | Example | Version Bump |
|-------------|---------|-------------|
| Bug fix | Fix login redirect | `1.0.0` → `1.0.1` |
| New feature | Add client module | `1.0.1` → `1.1.0` |
| Breaking change | Change API response format | `1.1.0` → `2.0.0` |
| Hotfix | Fix payment crash in production | `1.1.0` → `1.1.1` |

### What Constitutes a Breaking Change

| Breaking | Non-Breaking |
|----------|-------------|
| Remove API endpoint | Add new API endpoint |
| Rename response field | Add optional response field |
| Change required request fields | Add optional request field |
| Change authentication method | Add new auth provider |
| Remove database column | Add database column |
| Change permission requirements | Add new permissions |

### Monorepo Versioning

All packages in the monorepo share the **same version number**:

```
apps/web/package.json        → "version": "1.2.0"
apps/api/package.json        → "version": "1.2.0"
packages/shared/package.json → "version": "1.2.0"
packages/database/package.json → "version": "1.2.0"
```

### Git Tags

- Format: `v1.2.0` (prefixed with `v`)
- Annotated tags only (not lightweight)
- Every tag on `main` triggers production deployment
- Tags are immutable — never delete or move tags

### Pre-Release Versions

During development between releases:

```
1.2.0-alpha.1    # Internal testing
1.2.0-beta.1     # Staging / QA
1.2.0-rc.1       # Release candidate
1.2.0            # Production release
```

---

## 9. Git Ignore Strategy

### Principles

1. **Never commit secrets** — `.env`, credentials, API keys
2. **Never commit generated files** — build output, Prisma client (generated on install)
3. **Never commit dependencies** — `node_modules/`
4. **Never commit IDE-specific files** — unless team-standardized (`.vscode/settings.json` is OK)
5. **Always commit lockfiles** — `pnpm-lock.yaml`
6. **Always commit `.env.example`** — documents required variables without values

### Root `.gitignore`

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Environment
.env
.env.local
.env.*.local
.env.staging
.env.production

# Build output
dist/
build/
.next/
out/
.turbo/

# Generated
packages/database/generated/
*.tsbuildinfo

# IDE
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage/
.nyc_output/

# Prisma
packages/database/prisma/*.db
packages/database/prisma/*.db-journal

# Docker
docker/volumes/

# Misc
*.pem
*.key
*.cert
.vercel
```

### What Must Be Committed

| File | Reason |
|------|--------|
| `pnpm-lock.yaml` | Reproducible dependency resolution |
| `.env.example` | Documents required environment variables |
| `apps/web/.env.local.example` | Frontend env template |
| `apps/api/.env.example` | Backend env template |
| `prisma/migrations/` | Database migration history |
| `.github/` | CI/CD workflows |
| `docs/` | All documentation |

### Secret Scanning

- Enable GitHub Secret Scanning on the repository
- Pre-commit hooks check for common secret patterns
- CI pipeline fails if secrets detected in diff
- If a secret is accidentally committed: rotate immediately, use `git filter-repo` to purge history

---

## 10. Folder Protection Rules

### Branch Protection (GitHub Settings)

#### `main` Branch

| Rule | Setting |
|------|---------|
| Require pull request before merging | Yes |
| Required approvals | 2 (1 must be Tech Lead) |
| Dismiss stale reviews | Yes |
| Require review from code owners | Yes |
| Require status checks to pass | Yes |
| Required checks | `lint`, `type-check`, `test`, `build` |
| Require branches to be up to date | Yes |
| Require signed commits | Recommended |
| Include administrators | Yes |
| Restrict push | No direct push allowed |
| Allow force push | No |
| Allow deletion | No |

#### `develop` Branch

| Rule | Setting |
|------|---------|
| Require pull request before merging | Yes |
| Required approvals | 1 |
| Require status checks to pass | Yes |
| Required checks | `lint`, `type-check`, `test` |
| Require branches to be up to date | Yes |
| Allow force push | No |
| Allow deletion | No |

### Protected Paths

Certain paths require additional review from designated code owners (see [Code Ownership](#11-code-ownership)):

| Path | Protection Level | Required Reviewer |
|------|-----------------|-------------------|
| `packages/database/prisma/` | Critical | Database Lead |
| `packages/shared/src/schemas/` | Critical | Tech Lead |
| `packages/config/` | Critical | DevOps Lead |
| `apps/api/src/middleware/` | High | Backend Lead |
| `.github/workflows/` | High | DevOps Lead |
| `docker/` | High | DevOps Lead |
| `docs/adr/` | Medium | Tech Lead |
| `apps/web/src/components/ui/` | Medium | Frontend Lead |

### File-Level Rules

| Rule | Enforcement |
|------|-------------|
| No `.env` files committed | `.gitignore` + CI secret scanning |
| No `any` type in TypeScript | ESLint rule `@typescript-eslint/no-explicit-any: error` |
| No `console.log` in production code | ESLint rule `no-console: warn` |
| Max file length 300 lines | ESLint rule (warn; refactor if exceeded) |
| Imports at top of file only | ESLint rule `no-inline-imports` |
| Prisma migrations must be included with schema changes | PR review checklist |

---

## 11. Code Ownership

We use a `CODEOWNERS` file to automatically assign reviewers based on file paths.

### `CODEOWNERS` File

```
# .github/CODEOWNERS

# Default owners
*                           @org/tech-lead

# Frontend
/apps/web/                  @org/frontend-lead
/apps/web/src/components/ui/  @org/frontend-lead
/apps/web/src/features/     @org/frontend-team

# Backend
/apps/api/                  @org/backend-lead
/apps/api/src/middleware/   @org/backend-lead @org/tech-lead
/apps/api/src/modules/      @org/backend-team

# Shared packages
/packages/shared/           @org/tech-lead
/packages/database/         @org/database-lead @org/tech-lead
/packages/config/           @org/devops-lead @org/tech-lead

# Infrastructure
/.github/                   @org/devops-lead
/docker/                    @org/devops-lead
/scripts/                   @org/devops-lead

# Documentation
/docs/adr/                  @org/tech-lead
/docs/                      @org/tech-lead
```

### Team Responsibilities

| Team | Owns | Reviews |
|------|------|---------|
| **Tech Lead** | Architecture, shared packages, ADRs | All critical paths |
| **Frontend Lead** | `apps/web`, UI components, design system | Frontend PRs |
| **Backend Lead** | `apps/api`, middleware, integrations | Backend PRs |
| **Database Lead** | Prisma schema, migrations, seeds | Database changes |
| **DevOps Lead** | CI/CD, Docker, deployment, env config | Infrastructure PRs |
| **Frontend Team** | Feature modules in `apps/web/src/features/` | Frontend feature PRs |
| **Backend Team** | Feature modules in `apps/api/src/modules/` | Backend feature PRs |

### Ownership Rules

1. Code owners are automatically requested for review on PRs affecting their paths
2. At least one code owner approval required for protected paths
3. Code owners are responsible for the quality and architecture of their area
4. Ownership does not mean exclusive write access — anyone can contribute via PR
5. Ownership is updated when team structure changes

---

## 12. Development Workflow

### Complete Flow

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. Ticket  │───→│ 2. Branch    │───→│ 3. Develop   │───→│ 4. Commit    │
│  Assigned   │    │ from develop │    │ & Test Local │    │ (conventional)│
└─────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                    │
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────▼───────┐
│ 8. Release  │←───│ 7. QA on     │←───│ 6. Merge to  │←───│ 5. Pull       │
│ to Production│    │ Staging      │    │ develop      │    │ Request       │
└─────────────┘    └──────────────┘    └──────────────┘    └───────────────┘
```

### Step-by-Step

#### Step 1: Pick Up a Ticket

- Assign yourself to a ticket in the project management tool
- Read the ticket requirements and acceptance criteria
- Check for related ADRs or architecture decisions
- Ask questions before starting if requirements are unclear

#### Step 2: Create Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/EBM-142-client-management
```

#### Step 3: Develop Locally

- Follow the feature-based folder structure
- Write code following project conventions
- Run locally and test your changes:

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start database (Docker)
docker compose up -d

# Run migrations
pnpm --filter @database/client prisma migrate dev

# Start development servers
pnpm dev                    # Starts both web and api
pnpm --filter web dev       # Frontend only (localhost:3000)
pnpm --filter api dev       # Backend only (localhost:4000)
```

#### Step 4: Commit Changes

```bash
git add .
git commit -m "feat(clients): add client CRUD API endpoints"
```

- Make small, focused commits during development
- Commits will be squashed on merge — focus on logical units

#### Step 5: Create Pull Request

```bash
# Rebase on latest develop
git fetch origin
git rebase origin/develop

# Push branch
git push -u origin feature/EBM-142-client-management

# Create PR on GitHub: feature/EBM-142-client-management → develop
```

- Fill out the PR template completely
- Link the ticket number
- Add screenshots for UI changes
- Mark as Draft if not ready for review

#### Step 6: Code Review

- Request review from code owners
- Address all review comments
- Push fixes as additional commits (will be squashed)
- Re-request review after making changes

#### Step 7: Merge and Deploy to Staging

- PR approved and CI passing → Squash and Merge
- `develop` auto-deploys to staging environment
- QA team tests on staging
- Delete feature branch after merge

#### Step 8: Release to Production

- When `develop` is release-ready → create `release/v1.x.0` branch
- QA on release branch → merge to `main` → tag → production deploy
- See [Release Workflow](#7-release-workflow) for details

### Daily Developer Commands

```bash
# Start of day — sync with team
git checkout develop
git pull origin develop

# During development
git status                          # Check current state
git diff                            # Review unstaged changes
git log --oneline -10               # Recent commits

# Before PR
pnpm lint                           # Run linter
pnpm type-check                     # Run TypeScript check
pnpm test                           # Run tests
git rebase origin/develop           # Sync with develop

# After PR merged
git checkout develop
git pull origin develop
git branch -d feature/EBM-142-client-management    # Delete local branch
```

---

## 13. Best Practices

### Branching

- Keep feature branches short-lived (1–3 days max)
- Rebase on `develop` daily to avoid large merge conflicts
- Delete branches immediately after merge
- One feature per branch — do not combine unrelated work

### Commits

- Commit early and often during development
- Each commit should represent a logical unit of work
- Write commit messages for humans, not machines
- Reference ticket numbers in commit footers

### Pull Requests

- Keep PRs small and focused (< 400 lines)
- Self-review your own PR before requesting others
- Respond to review comments within 24 hours
- Do not force-push after review has started (add fix commits instead)

### Code Quality

- Run lint, type-check, and tests locally before pushing
- No `any` types — use proper TypeScript types
- No hardcoded values — use constants and environment variables
- No secrets in code — use environment variables
- Handle all error cases — no silent failures

### Monorepo Specific

- Changes to `packages/shared` affect both frontend and backend — test both
- Database schema changes require migration files
- Update `.env.example` when adding new environment variables
- Run `pnpm install` from root after dependency changes

### Communication

- Mark PR as Draft if not ready for review
- Use PR description to explain *why*, not just *what*
- Tag relevant people for awareness (not approval)
- Update ticket status when PR is created, reviewed, and merged

---

## 14. Common Mistakes to Avoid

### Branching Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|-----------------|
| Branching from `main` for features | Feature includes unrelated production code | Always branch from `develop` |
| Long-lived feature branches (weeks) | Massive merge conflicts | Merge or rebase daily; split large features |
| Not deleting merged branches | Cluttered branch list | Delete after merge (local and remote) |
| Working directly on `develop` | Bypasses code review | Always use feature branches |
| Force pushing to shared branches | Destroys team history | Never force push `main` or `develop` |

### Commit Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|-----------------|
| Vague messages: "fix bug", "update" | Useless git history | Use Conventional Commits with scope |
| Mixing unrelated changes in one commit | Hard to revert, review, or bisect | One logical change per commit |
| Committing secrets | Security breach | Use `.env` files; enable secret scanning |
| Committing `node_modules/` | Bloated repo | Verify `.gitignore` is working |
| Committing generated files | Merge conflicts on generated code | Add to `.gitignore` |

### PR Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|-----------------|
| Giant PRs (1000+ lines) | Unreviewable; bugs slip through | Split into smaller PRs (< 400 lines) |
| No PR description | Reviewers lack context | Fill out the PR template |
| Ignoring CI failures | Broken code in `develop` | Fix CI before requesting review |
| Self-merging without approval | No code review | Wait for required approvals |
| Not linking ticket | Untraceable changes | Always reference ticket number |

### Monorepo Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|-----------------|
| Changing shared types without updating consumers | Build failures in other packages | Update all affected packages in same PR |
| Schema change without migration | Production database out of sync | Always include Prisma migration |
| Importing app code into shared packages | Circular dependencies | Shared packages never import from apps |
| Running commands in wrong package directory | Unexpected behavior | Use `pnpm --filter <package>` from root |

### Security Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|-----------------|
| Committing `.env` files | Exposed secrets | Use `.env.example`; verify `.gitignore` |
| Hardcoding API keys | Secrets in git history | Use environment variables |
| Skipping RBAC on new endpoints | Unauthorized access | Always add auth + permission middleware |
| Logging sensitive data | PII in log files | Never log passwords, tokens, or card numbers |

---

## 15. Enterprise Development Rules

These rules are **mandatory** for all team members. Violations block PR merge.

### Code Rules

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **Strict TypeScript** — no `any` type | ESLint + PR review |
| 2 | **No duplicate code** — DRY principle | PR review |
| 3 | **No duplicate components** — reuse from `components/` | PR review |
| 4 | **Feature-based structure** — code in correct feature folder | PR review |
| 5 | **Clean Architecture** — Controller → Service → Repository | PR review |
| 6 | **Zod validation** — all inputs validated on FE and BE | PR review |
| 7 | **RBAC on all endpoints** — auth + permission middleware | PR review |
| 8 | **Audit logs** — all data mutations logged | PR review |
| 9 | **No secrets in code** — environment variables only | CI secret scanning |
| 10 | **No `console.log`** — use structured logger | ESLint |

### Git Rules

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **Conventional Commits** — all commit messages | PR squash title |
| 2 | **Branch naming** — follow naming convention | PR review |
| 3 | **PR required** — no direct push to `main` or `develop` | Branch protection |
| 4 | **Code review required** — minimum 1 approval | Branch protection |
| 5 | **CI must pass** — lint, type-check, test | Branch protection |
| 6 | **Rebase before PR** — branch up to date with target | Branch protection |
| 7 | **Delete merged branches** — keep repo clean | Team policy |
| 8 | **Link tickets** — every PR references a ticket | PR template |
| 9 | **Signed commits** — recommended for `main` | Branch protection |
| 10 | **No force push** to shared branches | Branch protection |

### Process Rules

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **Ticket before code** — no work without a ticket | Team policy |
| 2 | **ADR for architecture changes** — document significant decisions | PR review |
| 3 | **Migration with schema changes** — always include Prisma migration | PR review |
| 4 | **Update docs** — keep documentation current | PR review |
| 5 | **Test before PR** — run lint, type-check, test locally | Developer responsibility |
| 6 | **QA on staging** — no production release without staging QA | Release process |
| 7 | **Semantic versioning** — follow SemVer for all releases | Release process |
| 8 | **Changelog updated** — every release documented | Release process |
| 9 | **Environment variables documented** — update `.env.example` | PR review |
| 10 | **Security review** — for auth, payment, and data access changes | Code owner review |

### Violation Consequences

| Severity | Example | Action |
|----------|---------|--------|
| **Low** | Missing ticket link, typo in commit message | Comment in PR; fix before merge |
| **Medium** | Missing test, no PR description, large PR | Request changes; must fix before approval |
| **High** | No RBAC on endpoint, `any` type, committed secret | Block merge; immediate fix required |
| **Critical** | Force push to `main`, committed production secret | Incident response; rotate secrets; team notification |

---

## Quick Reference Card

```
BRANCH:     feature/EBM-142-client-management
COMMIT:     feat(clients): add client CRUD API endpoints
PR TITLE:   feat(clients): add client management module
MERGE:      Squash and Merge → develop
RELEASE:    release/v1.2.0 → main → tag v1.2.0
VERSION:    MAJOR.MINOR.PATCH (SemVer)

FLOW:  Ticket → Branch → Code → Commit → PR → Review → Merge → Staging → Release → Production
```

---

## Related Documentation

- [Enterprise Folder Architecture](../ENTERPRISE_ARCHITECTURE.md)
- [Architecture Decision Records](./adr/README.md)
- [Project Plan](../PROJECT_PLAN.md)
