import { Router } from "express";

import { API_PREFIX } from "@enterprise/shared";

import { authRouter } from "../modules/auth/auth.routes.js";
import { aiRouter } from "../modules/ai/ai.routes.js";
import { calendarRouter } from "../modules/calendar/calendar.routes.js";
import { clientsRouter } from "../modules/clients/clients.routes.js";
import { filesRouter } from "../modules/files/files.routes.js";
import { invoicesRouter } from "../modules/invoices/invoices.routes.js";
import { projectsRouter } from "../modules/projects/projects.routes.js";
import { tasksRouter } from "../modules/tasks/tasks.routes.js";
import { teamRouter } from "../modules/team/team.routes.js";
import { reportsRouter } from "../modules/reports/reports.routes.js";
import { notificationsRouter } from "../modules/notifications/notifications.routes.js";
import { communicationRouter } from "../modules/communication/index.js";
import { securityRouter } from "../modules/security/index.js";
import { settingsRouter } from "../modules/settings/index.js";
import { integrationsRouter } from "../modules/integrations/index.js";
import { whiteboardsRouter } from "../modules/whiteboards/index.js";
import { searchRouter } from "../modules/search/index.js";
import { billingRouter } from "../modules/billing/index.js";
import { publicApiRouter } from "../modules/public-api/index.js";
import { customerRequestsRouter } from "../modules/customer-requests/index.js";
import { buildSaasReadinessReport } from "../shared/services/saas-health.helpers.js";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/clients", clientsRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/customer-requests", customerRequestsRouter);
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/public", publicApiRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/files", filesRouter);
apiRouter.use("/calendar", calendarRouter);
apiRouter.use("/team", teamRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/communication", communicationRouter);
apiRouter.use("/security", securityRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/integrations", integrationsRouter);
apiRouter.use("/whiteboards", whiteboardsRouter);
apiRouter.use("/search", searchRouter);

apiRouter.get("/health", (_req, res) => {
  // Contract preserved: always { status, timestamp }.
  // SAAS_HEALTH_MONITORING runs readiness diagnostics asynchronously (logs only).
  void buildSaasReadinessReport().then((report) => {
    if (!report) return;
    console.info(
      `[saas] readiness level=${report.level} checks=${JSON.stringify(report.checks)}`,
    );
  });
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { apiRouter, API_PREFIX };
