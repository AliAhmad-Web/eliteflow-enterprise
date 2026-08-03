/**
 * Email automation composition helpers (Phase 7 Phase 2).
 * Reuses emailService contract — no provider migration.
 */

export interface EmailAutomationQueueMetadata {
  automation: true;
  approvalAware: boolean;
  retryPrepared: boolean;
  deliveryState: "queued" | "awaiting_approval" | "provider_ready";
  templateCode?: string;
  templateEnhanced?: boolean;
}

export function composeEmailAutomationMetadata(input: {
  approvalRequired?: boolean;
  templateCode?: string;
  templatesEnabled?: boolean;
}): EmailAutomationQueueMetadata {
  const approvalRequired = Boolean(input.approvalRequired);
  return {
    automation: true,
    approvalAware: true,
    retryPrepared: true,
    deliveryState: approvalRequired ? "awaiting_approval" : "queued",
    ...(input.templateCode ? { templateCode: input.templateCode } : {}),
    ...(input.templatesEnabled ? { templateEnhanced: true } : {}),
  };
}

export function enhanceEmailHtmlFooter(
  html: string,
  templatesEnabled: boolean,
): string {
  if (!templatesEnabled) return html;
  if (html.includes("data-eliteflow-email-template")) return html;
  return html.replace(
    "</div>",
    `<p data-eliteflow-email-template="1" style="color:#888;font-size:11px;margin-top:16px;">EliteFlow notification template</p></div>`,
  );
}
