# Authentication Security Checklist

Use before promoting auth to production.

## Secrets & config

- [ ] `JWT_SECRET` ≥ 32 chars, unique per environment  
- [ ] `JWT_ISSUER` / `JWT_AUDIENCE` set deliberately  
- [ ] `CORS_ORIGIN` is exact production web origin (not `*`, not localhost)  
- [ ] `DATABASE_URL` not committed; SSL enforced  
- [ ] `RESEND_API_KEY` / `EMAIL_FROM` configured  
- [ ] Supabase service role key server-only (never `NEXT_PUBLIC_`)  
- [ ] `NODE_ENV=production`  

## Transport & cookies

- [ ] HTTPS only in production  
- [ ] Refresh cookie: HttpOnly, Secure, SameSite=Strict, path `/api/v1/auth`  
- [ ] Access token memory-only (Zustand), not localStorage  

## Token & session

- [ ] Access TTL 15m; refresh 7d  
- [ ] Rotation + reuse detection verified in staging  
- [ ] Session cleanup job running  
- [ ] Idle session index migrated  

## Abuse controls

- [ ] Login / signup / OTP / forgot-password rate limits observed  
- [ ] Plan Redis rate limit for multi-instance  

## App hardening

- [ ] Helmet enabled  
- [ ] Zod validation on all auth bodies/params  
- [ ] Error handler does not leak stack traces to clients  
- [ ] Audit log queries available to ops  

## Posture

- [ ] 2FA login path tested  
- [ ] Remote session revoke tested  
- [ ] OAuth account linking policy reviewed  
