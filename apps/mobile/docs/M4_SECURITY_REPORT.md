# M4 — Security Report

## Verdict

Mobile security controls are **complete for a client app** without changing platform auth. Tokens remain server-validated JWTs; biometrics only gate the local shell.

## Controls

| Control | Implementation | Status |
|---------|----------------|--------|
| Secure storage | `expo-secure-store` via `secure-token-storage.ts` for access/refresh tokens + cached user | Pass |
| Face ID | `expo-local-authentication` facial recognition | Pass |
| Fingerprint | Same API; device type labeling | Pass |
| App lock | Lock on background when enabled; BiometricGate overlay | Pass |
| Session timeout | Configurable 0 / 1 / 5 / 15 minutes idle | Pass |
| Auth model | Unchanged — login/OTP/refresh against existing `/api/v1/auth` | Pass |
| Permissions | Existing role/permission checks via `usePermissions` | Pass |
| CSRF | Bearer clients skip CSRF (existing mobile pattern) | Pass |
| Transport | HTTPS API base URL (env) | Pass* |

\*Ensure production `EXPO_PUBLIC_API_URL` / env points to HTTPS only.

## Threat notes

- Biometric unlock **does not** replace password login; it unlocks an already-authenticated session.
- Clearing SecureStore on logout remains required (existing `authService.logout` + store clear).
- Offline mutation queue stores request bodies in AsyncStorage — treat device as trusted; no secrets beyond mutation payloads.
- Push token stored in AsyncStorage until backend registration exists.

## Residual risks / blockers

1. No remote wipe / MDM integration (out of scope).
2. Push registration cannot be authenticated server-side until backend endpoint ships.
3. Certificate pinning not implemented (platform default TLS only).
