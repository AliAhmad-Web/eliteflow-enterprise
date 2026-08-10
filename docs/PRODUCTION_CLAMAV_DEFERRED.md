# Production ClamAV / Virus Scanning — DEFERRED

**Status:** DEFERRED (not production-live)  
**Date:** 2026-08-08  
**Updated:** 2026-08-10 (P1-05)

## Reason

Railway workspace plan caps containers at **1 GB RAM**. ClamAV/`clamd` requires **≥ 2 GB** to load signature databases. We are **not** upgrading the Railway plan at this time.

## Architecture (unchanged — do not replace)

Upload pipeline still uses: MIME + magic-byte + extension + size limits + ACL + `AntivirusService` abstraction + `VIRUS_SCAN_FAIL_CLOSED` (default **true**).

When scanning is **disabled**, results use `status: "skipped"` and must **never** be treated as verified clean (detail states “NOT verified clean”).

Durable `ManagedFile.scanStatus` is **not** required while scanning remains synchronous-at-upload and ClamAV is offline. If async scanning is introduced later, add PENDING/CLEAN/INFECTED/FAILED and gate download/preview.

## Locked configuration (do not change for this deferral)

- `VIRUS_SCAN_ENABLED=false`
- Keep existing ClamAV service config, volume, and vars intact for later re-enablement
- Do **not** disable `VIRUS_SCAN_FAIL_CLOSED` as a workaround
- Do **not** switch provider to `noop` solely to “pass” uploads

## Resume later

1. Raise Railway plan / `railway-clamav` memory to ≥ 2 GB  
2. Confirm `clamd` listens on port 3310  
3. Set `VIRUS_SCAN_ENABLED=true` (keep `VIRUS_SCAN_FAIL_CLOSED=true`)  
4. Verify clean accept + EICAR reject  
5. Only then mark ClamAV as production-live

**STOP:** Do not claim ClamAV is production-live until connectivity and EICAR rejection are verified.
