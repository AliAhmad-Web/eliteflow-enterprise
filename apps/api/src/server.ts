import "./dns-bootstrap.js";

import { createApp } from "./app.js";
import { assertAuthConfig, authConfig } from "./config/auth.config.js";
import { startSessionCleanupJob } from "./jobs/session-cleanup.job.js";
import { getAiProvider } from "./modules/ai/providers/index.js";
import { warmIntegrationRuntimeCaches } from "./modules/integrations/warm-integration-runtime.js";
import {
  getGitHubOAuthConfig,
  getGoogleOAuthConfig,
} from "./modules/integrations/oauth/oauth-config.js";
import { storageProvider } from "./modules/files/storage/storage.provider.js";
import { runSaasStartupValidation } from "./shared/services/saas-operational.helpers.js";

assertAuthConfig();
runSaasStartupValidation();

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
  startSessionCleanupJob();
});
