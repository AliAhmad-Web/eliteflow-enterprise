import { randomBytes } from "node:crypto";

import * as argon2 from "argon2";
import type {
  CreatePublicApiKeyInput,
  PublicApiKeyDto,
  PublicApiScope,
} from "@enterprise/shared";
import {
  PUBLIC_API_KEY_PREFIX,
  PUBLIC_API_ERROR_CODES,
  UserRole,
} from "@enterprise/shared";

import {
  PUBLIC_API_AUDIT_ACTIONS,
  logPublicApiAuditEvent,
} from "./public-api.audit.js";
import { PublicApiError } from "./public-api.errors.js";
import {
  publicApiKeysRepository,
  type PublicApiKeyRecord,
} from "./public-api-keys.repository.js";

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export type PublicApiKeyActor = {
  userId: string;
  role: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function toDto(row: PublicApiKeyRecord): PublicApiKeyDto {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: row.scopes,
    clientId: row.clientId,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function assertCanManageKeys(actor: PublicApiKeyActor): void {
  if (
    actor.role !== UserRole.ADMIN &&
    actor.role !== UserRole.SUPER_ADMIN
  ) {
    throw new PublicApiError(
      "You do not have permission to manage public API keys",
      403,
      PUBLIC_API_ERROR_CODES.FORBIDDEN,
    );
  }
}

function generateRawKey(): { rawKey: string; keyPrefix: string } {
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${PUBLIC_API_KEY_PREFIX}${secret}`;
  const keyPrefix = rawKey.slice(0, 16);
  return { rawKey, keyPrefix };
}

export class PublicApiKeysService {
  async create(
    input: CreatePublicApiKeyInput,
    actor: PublicApiKeyActor,
  ): Promise<{ key: PublicApiKeyDto; secret: string }> {
    assertCanManageKeys(actor);

    const clientId = input.clientId ?? null;
    if (clientId) {
      const exists = await publicApiKeysRepository.clientExists(clientId);
      if (!exists) {
        throw new PublicApiError(
          "Bound client was not found",
          400,
          PUBLIC_API_ERROR_CODES.VALIDATION_ERROR,
        );
      }
    }

    const scopes = Array.from(new Set(input.scopes)) as PublicApiScope[];
    const { rawKey, keyPrefix } = generateRawKey();
    const keyHash = await argon2.hash(rawKey, ARGON2_OPTIONS);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new PublicApiError(
        "Invalid expiresAt",
        400,
        PUBLIC_API_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const created = await publicApiKeysRepository.create({
      name: input.name,
      keyPrefix,
      keyHash,
      scopes,
      ownerUserId: actor.userId,
      clientId,
      expiresAt,
    });

    await logPublicApiAuditEvent({
      userId: actor.userId,
      action: PUBLIC_API_AUDIT_ACTIONS.KEY_CREATED,
      resourceId: created.id,
      metadata: {
        keyPrefix,
        scopes,
        clientId,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { key: toDto(created), secret: rawKey };
  }

  async list(actor: PublicApiKeyActor): Promise<PublicApiKeyDto[]> {
    assertCanManageKeys(actor);
    const rows = await publicApiKeysRepository.listAll(100);
    return rows.map(toDto);
  }

  async revoke(
    id: string,
    actor: PublicApiKeyActor,
  ): Promise<PublicApiKeyDto> {
    assertCanManageKeys(actor);
    const existing = await publicApiKeysRepository.findById(id);
    if (!existing) {
      throw new PublicApiError(
        "API key not found",
        404,
        PUBLIC_API_ERROR_CODES.NOT_FOUND,
      );
    }
    if (existing.revokedAt) {
      return toDto(existing);
    }
    const revoked = await publicApiKeysRepository.revoke(id);
    await logPublicApiAuditEvent({
      userId: actor.userId,
      action: PUBLIC_API_AUDIT_ACTIONS.KEY_REVOKED,
      resourceId: id,
      metadata: { keyPrefix: revoked.keyPrefix },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toDto(revoked);
  }

  async authenticateRawKey(rawKey: string): Promise<PublicApiKeyRecord> {
    const trimmed = rawKey.trim();
    if (!trimmed.startsWith(PUBLIC_API_KEY_PREFIX) || trimmed.length < 20) {
      throw new PublicApiError(
        "Invalid API credentials",
        401,
        PUBLIC_API_ERROR_CODES.UNAUTHORIZED,
      );
    }

    const keyPrefix = trimmed.slice(0, 16);
    const record = await publicApiKeysRepository.findByPrefix(keyPrefix);
    if (!record) {
      throw new PublicApiError(
        "Invalid API credentials",
        401,
        PUBLIC_API_ERROR_CODES.UNAUTHORIZED,
      );
    }

    if (record.revokedAt) {
      throw new PublicApiError(
        "API key has been revoked",
        401,
        PUBLIC_API_ERROR_CODES.KEY_REVOKED,
      );
    }

    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      throw new PublicApiError(
        "API key has expired",
        401,
        PUBLIC_API_ERROR_CODES.KEY_EXPIRED,
      );
    }

    const valid = await argon2.verify(record.keyHash, trimmed).catch(() => false);
    if (!valid) {
      throw new PublicApiError(
        "Invalid API credentials",
        401,
        PUBLIC_API_ERROR_CODES.UNAUTHORIZED,
      );
    }

    void publicApiKeysRepository.touchLastUsed(record.id).catch(() => undefined);
    return record;
  }
}

export const publicApiKeysService = new PublicApiKeysService();
