import { randomBytes } from "node:crypto";

import {
  decryptSecret,
  encryptSecret,
} from "../settings/settings.crypto.js";
import { integrationsRepository } from "./integrations.repository.js";

/**
 * CredentialManager — encrypts and stores connection secrets.
 * Reuses Settings AES-256-GCM crypto; writes to Credential (not Settings API keys).
 */
export class CredentialManager {
  async storeConnectionSecret(input: {
    integrationId: string;
    keyName: string;
    plaintext: string;
    userId: string;
    expiresAt?: Date | null;
  }) {
    const encrypted = encryptSecret(input.plaintext);
    return integrationsRepository.upsertCredential({
      integrationId: input.integrationId,
      keyName: input.keyName,
      encryptedSecret: encrypted.encryptedSecret,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      secretLast4: encrypted.secretLast4,
      createdById: input.userId,
      expiresAt: input.expiresAt ?? null,
    });
  }

  /**
   * Architecture-only connect: stores a simulated placeholder credential.
   * Real OAuth tokens arrive in later Phase 19 sub-phases.
   */
  async storePlaceholderCredential(input: {
    integrationId: string;
    userId: string;
    label?: string;
    secret?: string;
  }) {
    const plaintext =
      input.secret?.trim() ||
      `ef-placeholder-${input.label ?? "connection"}-${randomBytes(16).toString("hex")}`;

    return this.storeConnectionSecret({
      integrationId: input.integrationId,
      keyName: "connection_token",
      plaintext,
      userId: input.userId,
    });
  }

  async revokeAll(integrationId: string, userId: string) {
    return integrationsRepository.softDeleteCredentials(integrationId, userId);
  }

  async hasActiveCredentials(integrationId: string): Promise<boolean> {
    const rows = await integrationsRepository.findActiveCredentials(
      integrationId,
    );
    return rows.length > 0;
  }

  async decryptActive(
    integrationId: string,
    keyName = "connection_token",
  ): Promise<string | null> {
    const rows = await integrationsRepository.findActiveCredentials(
      integrationId,
    );
    const match = rows.find((row) => row.keyName === keyName);
    if (!match) return null;
    return decryptSecret({
      encryptedSecret: match.encryptedSecret,
      iv: match.iv,
      authTag: match.authTag,
    });
  }
}

export const credentialManager = new CredentialManager();
