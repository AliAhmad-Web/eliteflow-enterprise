# @enterprise/api

Express API server for the Enterprise Business Management application.

## Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/signup` | No | Register new account |
| `POST` | `/api/v1/auth/login` | No | Login (may return OTP challenge) |
| `POST` | `/api/v1/auth/logout` | Bearer | Revoke session, clear cookie |
| `POST` | `/api/v1/auth/refresh` | Cookie | Rotate refresh token, new access token |
| `GET` | `/api/v1/auth/me` | Bearer | Get current user profile |
| `POST` | `/api/v1/auth/forgot-password` | No | Request password reset email |
| `POST` | `/api/v1/auth/reset-password` | No | Reset password with token |
| `POST` | `/api/v1/auth/verify-email` | No | Verify email with token |
| `GET` | `/api/v1/auth/verify-email` | No | Verify email (redirect flow) |
| `POST` | `/api/v1/auth/resend-verification` | No | Resend verification email |
| `POST` | `/api/v1/auth/verify-otp` | No | Verify OTP (login or sensitive action) |
| `POST` | `/api/v1/auth/resend-otp` | No | Resend OTP code |
| `POST` | `/api/v1/auth/oauth/callback` | No | Complete Google/GitHub OAuth login |
| `POST` | `/api/v1/auth/oauth/link` | Bearer | Link OAuth provider to account |
| `POST` | `/api/v1/auth/oauth/unlink` | Bearer | Unlink OAuth provider |
| `GET` | `/api/v1/health` | No | Health check |

## Setup

```bash
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET (min 32 chars)
# For OAuth: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

npm install
npm run dev
```

## Scripts

```bash
npm run dev          # Development with hot reload
npm run type-check   # TypeScript validation
npm run build        # Compile to dist/
```

## Module Structure

```
src/modules/auth/
├── auth.routes.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.repository.ts
├── auth.validation.ts
├── auth.tokens.ts
├── auth.cookies.ts
├── auth.audit.ts
├── auth.otp.ts
├── auth.errors.ts
├── auth.constants.ts
├── auth.types.ts
└── index.ts

src/integrations/
├── email/email.service.ts
└── supabase/
    ├── supabase.client.ts
    └── supabase.auth.ts
```
