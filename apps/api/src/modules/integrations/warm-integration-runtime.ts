/**
 * Warm AI / email runtime caches from Integration Center + Settings on boot.
 */

import { prisma } from "@enterprise/database";

import {
  setAiPreferredProvider,
  setAiProviderApiKey,
  setAiProviderModel,
  type AiProviderId,
} from "../ai/providers/ai-runtime-config.js";
import { decryptSecret } from "../settings/settings.crypto.js";
import { setResendRuntimeApiKey } from "../../integrations/email/email-runtime-config.js";

function asLiveAiProvider(
  value: string,
): Exclude<AiProviderId, "mock"> | null {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "gemini" ||
    normalized === "openai" ||
    normalized === "claude"
  ) {
    return normalized;
  }
  return null;
}

export async function warmIntegrationRuntimeCaches(): Promise<void> {
  try {
    const prefs = await prisma.userPreference.findFirst({
      where: { aiProvider: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { aiProvider: true, aiModel: true },
    });
    if (prefs?.aiProvider) {
      setAiPreferredProvider(prefs.aiProvider);
      const provider = asLiveAiProvider(prefs.aiProvider);
      if (provider && prefs.aiModel) {
        setAiProviderModel(provider, prefs.aiModel);
      }
    }

    const integrations = await prisma.integration.findMany({
      where: {
        deletedAt: null,
        isConnected: true,
        slug: { in: ["gemini", "openai", "resend"] },
      },
      include: {
        credentials: {
          where: { deletedAt: null, isActive: true },
        },
      },
    });

    for (const integration of integrations) {
      const cred =
        integration.credentials.find((c) => c.keyName === "api_key") ||
        integration.credentials[0];
      if (!cred) continue;
      try {
        const plaintext = decryptSecret({
          encryptedSecret: cred.encryptedSecret,
          iv: cred.iv,
          authTag: cred.authTag,
        });
        if (!plaintext || plaintext.startsWith("env:")) continue;
        if (integration.slug === "gemini") {
          setAiProviderApiKey("gemini", plaintext);
        } else if (integration.slug === "openai") {
          setAiProviderApiKey("openai", plaintext);
        } else if (integration.slug === "resend") {
          setResendRuntimeApiKey(plaintext);
        }
      } catch {
        // Skip undecryptable vault rows; env fallback remains.
      }
    }
  } catch (error) {
    console.warn(
      "[integrations] Failed to warm runtime caches:",
      error instanceof Error ? error.message : error,
    );
  }
}
