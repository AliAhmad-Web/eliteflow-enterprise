import type { Request, Response } from "express";

import type {
  ApiKeyIntegrationProviderValue,
  ConnectApiKeyIntegrationInput,
  ConnectIntegrationInput,
  DisconnectIntegrationInput,
  ListIntegrationAlertsQueryInput,
  ListIntegrationLogsQueryInput,
  ListIntegrationsQueryInput,
  ListSyncHistoryQueryInput,
  ManualSyncInput,
  OAuthCallbackQueryInput,
  OAuthIntegrationProviderValue,
  TestIntegrationInput,
  UpdateSchedulerConfigInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { alertService } from "./alerts/alert.service.js";
import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "./integrations.errors.js";
import { integrationService } from "./integrations.service.js";
import { apiKeyProviderService } from "./api-keys/api-key-provider.service.js";
import { monitoringService } from "./monitoring/monitoring.service.js";
import { platformDetailService } from "./monitoring/platform-detail.service.js";
import { oauthProviderService } from "./oauth/oauth-provider.service.js";
import { queueService } from "./queue/queue.service.js";
import { schedulerService } from "./scheduler/scheduler.service.js";
import { syncEngineService } from "./sync-engine/sync-engine.service.js";
import { usageAnalyticsService } from "./usage-analytics/usage-analytics.service.js";
import { webhookMonitorService } from "./webhook-monitor/webhook-monitor.service.js";
import type {
  IntegrationsActor,
  IntegrationsRequestContext,
} from "./integrations.types.js";

function getActor(req: Request): IntegrationsActor {
  if (!req.auth) {
    throw new IntegrationsError(
      "Authentication required",
      401,
      INTEGRATIONS_ERROR_CODES.FORBIDDEN,
    );
  }
  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? null,
  };
}

function getContext(req: Request): IntegrationsRequestContext {
  return {
    ipAddress: req.ip ?? "0.0.0.0",
    userAgent: req.get("user-agent") ?? "unknown",
  };
}

export class IntegrationsController {
  async list(req: Request, res: Response) {
    const result = await integrationService.list(
      req.query as unknown as ListIntegrationsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Integrations retrieved"));
  }

  async getById(req: Request, res: Response) {
    const result = await integrationService.getById(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(result, "Integration retrieved"));
  }

  async getBySlug(req: Request, res: Response) {
    const result = await integrationService.getBySlug(
      req.params.slug as string,
      getActor(req),
    );
    res.json(successResponse(result, "Integration retrieved"));
  }

  async connect(req: Request, res: Response) {
    const result = await integrationService.connect(
      req.body as ConnectIntegrationInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async disconnect(req: Request, res: Response) {
    const result = await integrationService.disconnect(
      req.body as DisconnectIntegrationInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async test(req: Request, res: Response) {
    const result = await integrationService.test(
      req.body as TestIntegrationInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async logs(req: Request, res: Response) {
    const result = await integrationService.listLogs(
      req.query as unknown as ListIntegrationLogsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Integration logs retrieved"));
  }

  async history(req: Request, res: Response) {
    const result = await integrationService.listHistory(
      req.query as unknown as ListSyncHistoryQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Sync history retrieved"));
  }

  async providerConnect(req: Request, res: Response) {
    const provider = req.params.provider as OAuthIntegrationProviderValue;
    const result = await oauthProviderService.startConnect(
      provider,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async providerDisconnect(req: Request, res: Response) {
    const provider = req.params.provider as OAuthIntegrationProviderValue;
    const result = await oauthProviderService.disconnect(
      provider,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async providerTest(req: Request, res: Response) {
    const provider = req.params.provider as OAuthIntegrationProviderValue;
    const result = await oauthProviderService.test(
      provider,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async providerStatus(req: Request, res: Response) {
    const provider = req.params.provider as OAuthIntegrationProviderValue;
    const result = await oauthProviderService.status(provider);
    res.json(successResponse(result, "Integration status retrieved"));
  }

  async apiKeyConnect(req: Request, res: Response) {
    const provider = req.params.provider as ApiKeyIntegrationProviderValue;
    const body = req.body as ConnectApiKeyIntegrationInput;
    const result = await apiKeyProviderService.connect(
      provider,
      { secret: body.secret, label: body.label },
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async apiKeyDisconnect(req: Request, res: Response) {
    const provider = req.params.provider as ApiKeyIntegrationProviderValue;
    const result = await apiKeyProviderService.disconnect(
      provider,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async apiKeyTest(req: Request, res: Response) {
    const provider = req.params.provider as ApiKeyIntegrationProviderValue;
    const result = await apiKeyProviderService.test(
      provider,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async apiKeyStatus(req: Request, res: Response) {
    const provider = req.params.provider as ApiKeyIntegrationProviderValue;
    const result = await apiKeyProviderService.status(provider);
    res.json(successResponse(result, "Integration status retrieved"));
  }

  async oauthCallbackGoogle(req: Request, res: Response) {
    const query = req.query as unknown as OAuthCallbackQueryInput;
    const result = await oauthProviderService.handleOAuthCallback({
      channel: "google",
      code: query.code,
      state: query.state,
      error: query.error,
      errorDescription: query.error_description,
      context: getContext(req),
    });
    res.redirect(result.redirectUrl);
  }

  async oauthCallbackGitHub(req: Request, res: Response) {
    const query = req.query as unknown as OAuthCallbackQueryInput;
    const result = await oauthProviderService.handleOAuthCallback({
      channel: "github",
      code: query.code,
      state: query.state,
      error: query.error,
      errorDescription: query.error_description,
      context: getContext(req),
    });
    res.redirect(result.redirectUrl);
  }

  async monitoringOverview(req: Request, res: Response) {
    const result = await monitoringService.overview(getActor(req));
    res.json(successResponse(result, "Monitoring overview retrieved"));
  }

  async monitoringForIntegration(req: Request, res: Response) {
    const result = await monitoringService.forIntegration(
      req.params.idOrSlug as string,
      getActor(req),
    );
    res.json(successResponse(result, "Integration monitoring retrieved"));
  }

  async queueOverview(req: Request, res: Response) {
    const result = await queueService.overview(getActor(req));
    res.json(successResponse(result, "Sync queue retrieved"));
  }

  async queueForIntegration(req: Request, res: Response) {
    const result = await queueService.overview(
      getActor(req),
      req.params.idOrSlug as string,
    );
    res.json(successResponse(result, "Integration sync queue retrieved"));
  }

  async webhookMonitor(req: Request, res: Response) {
    const result = await webhookMonitorService.overview(getActor(req));
    res.json(successResponse(result, "Webhook monitor retrieved"));
  }

  async webhookMonitorForIntegration(req: Request, res: Response) {
    const result = await webhookMonitorService.overview(
      getActor(req),
      req.params.idOrSlug as string,
    );
    res.json(successResponse(result, "Integration webhook monitor retrieved"));
  }

  async listAlerts(req: Request, res: Response) {
    const result = await alertService.list(
      req.query as unknown as ListIntegrationAlertsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Integration alerts retrieved"));
  }

  async evaluateAlerts(req: Request, res: Response) {
    const result = await alertService.evaluateVisible(getActor(req));
    res.json(successResponse(result, "Alerts evaluated"));
  }

  async acknowledgeAlert(req: Request, res: Response) {
    const result = await alertService.acknowledge(
      req.params.alertId as string,
      getActor(req),
    );
    res.json(successResponse(result, "Alert acknowledged"));
  }

  async retrySync(req: Request, res: Response) {
    const result = await syncEngineService.retryJob(
      req.params.jobId as string,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Sync job retried"));
  }

  async cancelSync(req: Request, res: Response) {
    const result = await syncEngineService.cancelJob(
      req.params.jobId as string,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Sync job cancelled"));
  }

  async platformDetail(req: Request, res: Response) {
    const result = await platformDetailService.get(
      req.params.idOrSlug as string,
      getActor(req),
    );
    res.json(successResponse(result, "Integration platform detail retrieved"));
  }

  async usageAnalytics(req: Request, res: Response) {
    const result = await usageAnalyticsService.forIntegration(
      req.params.idOrSlug as string,
      getActor(req),
    );
    res.json(successResponse(result, "Usage analytics retrieved"));
  }

  async getScheduler(req: Request, res: Response) {
    const result = await schedulerService.get(
      req.params.idOrSlug as string,
      getActor(req),
    );
    res.json(successResponse(result, "Scheduler configuration retrieved"));
  }

  async updateScheduler(req: Request, res: Response) {
    const result = await schedulerService.update(
      req.params.idOrSlug as string,
      req.body as UpdateSchedulerConfigInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Scheduler configuration updated"));
  }

  async manualSync(req: Request, res: Response) {
    const result = await syncEngineService.startManualSync(
      req.params.idOrSlug as string,
      req.body as ManualSyncInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Manual sync started"));
  }
}

export const integrationsController = new IntegrationsController();
