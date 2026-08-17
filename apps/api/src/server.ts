import "./instrument.js";
import "./dns-bootstrap.js";
import { installConsoleRedaction } from "./shared/security/install-console-redaction.js";

installConsoleRedaction();

import { createApp } from "./app.js";
import { assertAuthConfig, authConfig } from "./config/auth.config.js";
import { assertEnterpriseEncryptionConfig } from "./config/encryption.config.js";
import { assertProductionUploadHardeningEnabled } from "./config/security-flags.js";
import { startSessionCleanupJob } from "./jobs/session-cleanup.job.js";
import { startPerformanceRecalcJob } from "./jobs/performance-recalc.job.js";
import { startRetentionProcessorJob } from "./jobs/retention-processor.job.js";
import { startLeaveExpirationJob } from "./jobs/leave-expiration.job.js";
import { startBackupValidationJob } from "./jobs/backup-validation.job.js";
import { startEncryptionAuditJob } from "./jobs/encryption-audit.job.js";
import { startDisasterRecoveryTestJob } from "./jobs/disaster-recovery-test.job.js";
import { startPenetrationTestJob } from "./jobs/penetration-test.job.js";
import { getAiProvider } from "./modules/ai/providers/index.js";
import { warmIntegrationRuntimeCaches } from "./modules/integrations/warm-integration-runtime.js";
import {
  getGitHubOAuthConfig,
  getGoogleOAuthConfig,
} from "./modules/integrations/oauth/oauth-config.js";
import { storageProvider } from "./modules/files/storage/storage.provider.js";
import { runSaasStartupValidation } from "./shared/services/saas-operational.helpers.js";
import { reportSecurityHeadersStartup } from "./shared/security/security-headers/index.js";
import { startSiemSubscriptions } from "./shared/security/siem/index.js";
import { assertSiemProductionConfig } from "./shared/security/siem/siem.assert.js";
import {
  getRateLimitRedisUrl,
  isRateLimitEnabled,
  isRateLimitFailOpen,
} from "./shared/security/rate-limit/rate-limit.config.js";
import { redisRateLimiterService } from "./shared/security/rate-limit/redis-rate-limiter.service.js";
import { reportCoreConnectivity, reportSupabaseStorageProbe } from "./shared/security/connectivity-report.js";

assertAuthConfig();
assertEnterpriseEncryptionConfig();
assertProductionUploadHardeningEnabled();
assertSiemProductionConfig();
runSaasStartupValidation();
reportSecurityHeadersStartup();
reportCoreConnectivity();

const app = createApp();

app.listen(authConfig.port, () => {
  console.log(`[api] Server running on http://localhost:${authConfig.port}`);
  console.log(`[api] Auth base path: http://localhost:${authConfig.port}/api/v1/auth`);
  const google = getGoogleOAuthConfig();
  const github = getGitHubOAuthConfig();
  console.log(
    `[oauth] Google: ${google.configured ? "configured" : "NOT configured"} | GitHub: ${github.configured ? "configured" : "NOT configured"}`,
  );
  void warmIntegrationRuntimeCaches().then(() => {
    getAiProvider();
  });
  void storageProvider.name;
  void reportSupabaseStorageProbe();
  startSessionCleanupJob();
  startPerformanceRecalcJob();
  startRetentionProcessorJob();
  startLeaveExpirationJob();
  startSiemSubscriptions();
  startBackupValidationJob();
  startEncryptionAuditJob();
  startDisasterRecoveryTestJob();
  startPenetrationTestJob();

  if (isRateLimitEnabled()) {
    const redisUrl = getRateLimitRedisUrl();
    void redisRateLimiterService.ping().then((ok) => {
      const health = redisRateLimiterService.getHealth();
      console.log(
        `[rate-limit] enabled=true failOpen=${isRateLimitFailOpen()} ` +
          `redis=${redisUrl ? "configured" : "missing"} ` +
          `ping=${ok ? "ok" : "fail"} status=${health.status}`,
      );
    });
  } else {
    console.log("[rate-limit] enabled=false");
  }
});
