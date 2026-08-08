# Production ClamAV / Virus Scanning — DEFERRED

**Status:** DEFERRED  
**Date:** 2026-08-08  

## Reason

Railway workspace plan caps containers at **1 GB RAM**. ClamAV/`clamd` requires **≥ 2 GB** to load signature databases. We are **not** upgrading the Railway plan at this time.

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
