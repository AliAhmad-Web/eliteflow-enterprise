import { randomBytes } from "node:crypto";

import { encryptSecret } from "../settings/settings.crypto.js";
import { integrationsRepository } from "./integrations.repository.js";
import { mapWebhookEndpointDto } from "./integrations.mapper.js";
import { getAppUrl } from "./oauth/oauth-config.js";

/**
 * WebhookManager — registers inbound webhook endpoints (architecture only).
 * Phase 19.2 registers provider-specific event subscriptions.
 * Signing secrets are encrypted at rest; plaintext is never returned.
 * Event processing is deferred.
 */
export class WebhookManager {
  async ensureDefaultEndpoint(input: {
    integrationId: string;
    slug: string;
    userId: string;
  }) {
    return this.ensureProviderEndpoint({
      ...input,
      events: ["*"],
    });
  }

  async ensureProviderEndpoint(input: {
    integrationId: string;
    slug: string;
    userId: string;
    events: string[];
  }) {
    const existing = await integrationsRepository.listWebhooks(
      input.integrationId,
    );
    const active = existing.find((row) => row.isActive);
    if (active) {
      return mapWebhookEndpointDto(active);
    }

    const signingSecret = randomBytes(24).toString("hex");
    const encrypted = encryptSecret(signingSecret);

    const created = await integrationsRepository.createWebhook({
      integrationId: input.integrationId,
      url: `${getAppUrl()}/api/v1/integrations/webhooks/${input.slug}`,
      events: input.events,
      encryptedSecret: encrypted.encryptedSecret,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      createdById: input.userId,
    });

    return mapWebhookEndpointDto(created);
  }

  async deactivateAll(integrationId: string) {
    return integrationsRepository.deactivateWebhooks(integrationId);
  }

  async list(integrationId: string) {
    const rows = await integrationsRepository.listWebhooks(integrationId);
    return rows.map(mapWebhookEndpointDto);
  }
}

export const webhookManager = new WebhookManager();
