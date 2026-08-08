import type { AuthenticatedContext } from "@enterprise/shared";
import type { ResolvedApiVersion } from "../api-versioning/api-version.types.js";
import type { SessionRiskAssessment } from "../security/session-hardening/session-hardening.types.js";
import type { RequestTrustResult } from "../security/zero-trust/zero-trust.types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedContext;
      /** Continuous Zero Trust evaluation result (Phase 3 Step 11). */
      zeroTrust?: RequestTrustResult;
      /** Session hardening risk assessment (Phase 2 Step 3). */
      sessionHardening?: SessionRiskAssessment;
      /** Resolved Enterprise API version (before controllers). */
      apiVersion?: ResolvedApiVersion;
    }
  }
}

export {};
