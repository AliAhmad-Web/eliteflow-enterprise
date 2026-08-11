/**
 * Vercel serverless / Express entry — no app.listen, no in-process cron.
 * Long-running jobs remain a follow-up (pg_cron / Edge) per migration audit.
 */
import "./dns-bootstrap.js";
import { installConsoleRedaction } from "./shared/security/install-console-redaction.js";

installConsoleRedaction();

import { createApp } from "./app.js";
import { assertAuthConfig } from "./config/auth.config.js";
import { assertEnterpriseEncryptionConfig } from "./config/encryption.config.js";
import { assertProductionUploadHardeningEnabled } from "./config/security-flags.js";
import { assertSiemProductionConfig } from "./shared/security/siem/siem.assert.js";
import { runSaasStartupValidation } from "./shared/services/saas-operational.helpers.js";
import { reportSecurityHeadersStartup } from "./shared/security/security-headers/index.js";
import { reportCoreConnectivity } from "./shared/security/connectivity-report.js";

assertAuthConfig();
assertEnterpriseEncryptionConfig();
assertProductionUploadHardeningEnabled();
assertSiemProductionConfig();
runSaasStartupValidation();
reportSecurityHeadersStartup();
reportCoreConnectivity();

const app = createApp();

export default app;
