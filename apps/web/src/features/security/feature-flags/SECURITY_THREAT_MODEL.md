# Enterprise Threat Model (Phase 4 — Phase 1)

**Status:** Architecture only. No controls implemented in this phase.  
**Method:** Asset-centric STRIDE-style mapping against EliteFlow web + API.

---

## Assets

| Asset | Sensitivity |
|-------|-------------|
| User credentials / MFA OTP flows | Critical |
| JWT access tokens (browser memory) | High |
| Refresh tokens (httpOnly cookie) | Critical |
| Session records / RBAC bindings | High |
| Customer CRM data via APIs | High |
| Uploaded files | High |
| Integration OAuth secrets | Critical |
| Audit logs | Medium–High |

---

## Threat catalog

### 1. Authentication attacks
| Threat | Example | Current mitigations | Residual | Phase 2 flag |
|--------|---------|---------------------|----------|--------------|
| Credential stuffing | Automated login | Rate limit + reCAPTCHA | In-memory limiter | `RATE_LIMIT_HARDENING` |
| Password brute-force | Same | Same | Same | Same |
| Refresh theft | Cookie exfil (XSS/network) | httpOnly, Secure, rotation, reuse detect | Cross-site cookie topology | `SECURE_COOKIES` |

### 2. Authorization bypass
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| Client-only guard skip | Call API directly | API permission middleware | JWT permission lag | `PERMISSION_ENFORCEMENT` |
| IDOR | Guess resource IDs | Service-level authz (assumed per module) | Module variance | Audit gaps in Phase 2 |
| Edge hint forgery | Fake session hint cookie | API still requires Bearer | Soft edge gate | `EDGE_AUTH` |

### 3. Injection
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| SQL injection | Malicious query | Prisma parameterized | Low if Prisma-only | `REQUEST_VALIDATION` |
| NoSQL / JSON injection | Crafted bodies | Zod validation | Schema coverage gaps | Same |
| Command injection | Upload filenames | Validation + storage abstraction | Ops scripts out of band | Ops |

### 4. XSS
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| Stored XSS | SVG / HTML file | Magic bytes + SVG heuristics | SVG allow | Headers/CSP + upload policy |
| DOM XSS | Unsafe HTML | Minimal `dangerouslySetInnerHTML` | Future rich text | `CSP` |

### 5. CSRF
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| Cookie-auth state change | Cross-site POST | Double-submit CSRF | Bearer-only paths skip CSRF by design | `SECURE_COOKIES` review |

### 6. SSRF
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| Server fetches attacker URL | Integrations / webhooks | Allowlists (module-dependent) | Integration surface | Architecture review per provider |

### 7. Session hijacking / token theft
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| XSS steals access JWT | Script in app origin | CSP absent on web | High if XSS | `CSP` + `HTTP_HEADERS` |
| Refresh replay | Stolen cookie | Rotation + reuse revoke | Needs monitoring | `SESSION_POLICIES`, `AUDIT_ENHANCEMENT` |

### 8. Privilege escalation
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| Stale elevated JWT | Role demoted, token still admin | Short access TTL | Until expiry/refresh | `PERMISSION_ENFORCEMENT` |
| Mass assignment | Extra body fields | Zod strip/unknown handling | Schema discipline | `REQUEST_VALIDATION` |

### 9. File upload abuse
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| Malware / polyglot | Double extension | Magic bytes + MIME | AV not in-app | Ops / Phase 2 policy |
| Resource exhaustion | Large multi-upload | Size + count limits | Memory buffering | Streaming later |

### 10. API abuse / brute-force
| Threat | Example | Mitigations | Residual | Phase 2 |
|--------|---------|-------------|----------|---------|
| Endpoint flooding | Bypass auth limits | Per-route limits | Multi-instance gap | `RATE_LIMIT_HARDENING` |

---

## Trust boundaries

```
[Browser] --HTTPS--> [Next.js Web] --HTTPS + Bearer/CSRF--> [Express API] --> [Postgres / Storage / OAuth]
                ^                         ^
         session-hint cookie        refresh httpOnly cookie
```

- Web middleware is **not** a cryptographic trust boundary today.  
- API authz middleware **is** the authoritative boundary.

---

## Priority threats for Phase 2

1. XSS → token theft (CSP + headers)  
2. Edge hint forgery / weak soft-gate  
3. Distributed rate-limit evasion  
4. JWT permission staleness  
5. Upload SVG residual XSS  

---

*Threat model only — no control implementation in Phase 1.*
