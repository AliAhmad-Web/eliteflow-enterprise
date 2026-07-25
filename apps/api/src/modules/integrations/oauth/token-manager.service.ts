import { credentialManager } from "../credential-manager.service.js";
import { integrationsRepository } from "../integrations.repository.js";
import { CREDENTIAL_KEYS } from "./oauth-config.js";

export interface StoredTokenBundle {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string | null;
  scope: string | null;
  expiresAt: Date | null;
}

export interface PersistTokensInput {
  integrationId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresInSeconds?: number | null;
  expiresAt?: Date | null;
}

/**
 * TokenManager — encrypted OAuth token vault.
 * Never returns tokens to API clients. Supports refresh rotation.
 */
export class TokenManager {
  async persistTokens(input: PersistTokensInput): Promise<void> {
    if (!input.accessToken?.trim()) {
      throw new Error("accessToken is required");
    }

    const expiresAt =
      input.expiresAt ??
      (input.expiresInSeconds
        ? new Date(Date.now() + input.expiresInSeconds * 1000)
        : null);

    await credentialManager.storeConnectionSecret({
      integrationId: input.integrationId,
      keyName: CREDENTIAL_KEYS.ACCESS_TOKEN,
      plaintext: input.accessToken,
      userId: input.userId,
      expiresAt,
    });

    if (input.refreshToken) {
      await credentialManager.storeConnectionSecret({
        integrationId: input.integrationId,
        keyName: CREDENTIAL_KEYS.REFRESH_TOKEN,
        plaintext: input.refreshToken,
        userId: input.userId,
      });
    }

    if (input.tokenType) {
      await credentialManager.storeConnectionSecret({
        integrationId: input.integrationId,
        keyName: CREDENTIAL_KEYS.TOKEN_TYPE,
        plaintext: input.tokenType,
        userId: input.userId,
      });
    }

    if (input.scope) {
      await credentialManager.storeConnectionSecret({
        integrationId: input.integrationId,
        keyName: CREDENTIAL_KEYS.SCOPE,
        plaintext: input.scope,
        userId: input.userId,
      });
    }
  }

  async readBundle(integrationId: string): Promise<StoredTokenBundle | null> {
    const rows =
      await integrationsRepository.findActiveCredentials(integrationId);
    if (rows.length === 0) return null;

    const byKey = new Map(rows.map((row) => [row.keyName, row]));
    const accessRow = byKey.get(CREDENTIAL_KEYS.ACCESS_TOKEN);
    if (!accessRow) {
      return null;
    }

    const accessToken = await credentialManager.decryptActive(
      integrationId,
      CREDENTIAL_KEYS.ACCESS_TOKEN,
    );
    if (!accessToken) return null;

    const refreshToken = await credentialManager.decryptActive(
      integrationId,
      CREDENTIAL_KEYS.REFRESH_TOKEN,
    );
    const tokenType = await credentialManager.decryptActive(
      integrationId,
      CREDENTIAL_KEYS.TOKEN_TYPE,
    );
    const scope = await credentialManager.decryptActive(
      integrationId,
      CREDENTIAL_KEYS.SCOPE,
    );

    return {
      accessToken,
      refreshToken,
      tokenType,
      scope,
      expiresAt: accessRow.expiresAt,
    };
  }

  isExpired(expiresAt: Date | null | undefined, skewMs = 60_000): boolean {
    if (!expiresAt) return false;
    return expiresAt.getTime() <= Date.now() + skewMs;
  }

  async revoke(integrationId: string, userId: string): Promise<void> {
    await credentialManager.revokeAll(integrationId, userId);
  }

  /**
   * Rotate access token after a successful refresh grant.
   * Replaces refresh token when the provider returns a new one (rotation).
   */
  async rotateAfterRefresh(input: {
    integrationId: string;
    userId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresInSeconds?: number | null;
    tokenType?: string | null;
    scope?: string | null;
  }): Promise<void> {
    await this.persistTokens({
      integrationId: input.integrationId,
      userId: input.userId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenType: input.tokenType,
      scope: input.scope,
      expiresInSeconds: input.expiresInSeconds,
    });
  }
}

export const tokenManager = new TokenManager();
