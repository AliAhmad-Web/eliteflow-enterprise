import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, unlink, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isSupabaseStorageReady,
  supabaseConfig,
} from "../../../config/supabase.config.js";
import { tryGetSupabaseAdminClient } from "../../../integrations/supabase/supabase.client.js";

export interface StorageUploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folderKey?: string;
}

export interface StorageUploadResult {
  key: string;
  provider: string;
  sizeBytes: number;
  checksum: string;
}

export interface StorageProvider {
  readonly name: string;
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  download(
    key: string,
  ): Promise<{ stream: Readable; sizeBytes: number; mimeType?: string }>;
  delete(key: string): Promise<void>;
  getSignedUrl?(key: string, expiresInSeconds?: number): Promise<string>;
}

function checksumOf(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

/**
 * Reject path traversal / absolute / null-byte storage keys before I/O (F-10).
 */
export function assertSafeStorageKey(key: string): void {
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    throw new Error("Invalid storage key");
  }
  if (key.includes("\0")) {
    throw new Error("Invalid storage key");
  }

  const normalized = key.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error("Invalid storage key");
  }
  if (normalized.includes("//")) {
    throw new Error("Invalid storage key");
  }

  const segments = normalized.split("/");
  for (const segment of segments) {
    if (segment === ".." || segment === ".") {
      throw new Error("Invalid storage key");
    }
    if (segment.length === 0) {
      throw new Error("Invalid storage key");
    }
  }
}

/**
 * Resolve a storage key under root with a hard boundary check.
 * Avoids fragile `startsWith(root)` prefix bypasses (e.g. root vs root_evil).
 */
export function resolveContainedStoragePath(rootDir: string, key: string): string {
  assertSafeStorageKey(key);

  const root = path.resolve(rootDir);
  const full = path.resolve(root, key);
  const relative = path.relative(root, full);

  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Invalid storage key");
  }

  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (full !== root && !full.startsWith(rootPrefix)) {
    throw new Error("Invalid storage key");
  }

  return full;
}

function sanitizeFolderKey(folderKey?: string): string {
  const raw = (folderKey ?? "general").replace(/\\/g, "/").trim();
  if (!raw) return "general";
  assertSafeStorageKey(raw);
  return raw;
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  readonly root: string;

  constructor(rootDir?: string) {
    this.root = rootDir
      ? path.resolve(rootDir)
      : path.resolve(process.cwd(), "storage", "uploads");
  }

  private resolveKeyPath(key: string): string {
    return resolveContainedStoragePath(this.root, key);
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const folder = sanitizeFolderKey(input.folderKey);
    const key = `${folder}/${randomUUID()}-${sanitizeFileName(input.originalName)}`;
    assertSafeStorageKey(key);
    const fullPath = this.resolveKeyPath(key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, input.buffer);

    return {
      key,
      provider: this.name,
      sizeBytes: input.buffer.byteLength,
      checksum: checksumOf(input.buffer),
    };
  }

  async download(key: string) {
    const fullPath = this.resolveKeyPath(key);
    if (!existsSync(fullPath)) {
      throw new Error("File not found in storage");
    }
    const info = await stat(fullPath);
    return {
      stream: createReadStream(fullPath),
      sizeBytes: info.size,
    };
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolveKeyPath(key);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(client: SupabaseClient, bucket: string) {
    this.client = client;
    this.bucket = bucket;
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const folder = sanitizeFolderKey(input.folderKey);
    const key = `${folder}/${randomUUID()}-${sanitizeFileName(input.originalName)}`;
    assertSafeStorageKey(key);

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, input.buffer, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return {
      key,
      provider: this.name,
      sizeBytes: input.buffer.byteLength,
      checksum: checksumOf(input.buffer),
    };
  }

  async download(key: string) {
    assertSafeStorageKey(key);
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(key);

    if (error || !data) {
      throw new Error(
        `Supabase download failed: ${error?.message ?? "missing object"}`,
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const { Readable } = await import("node:stream");
    return {
      stream: Readable.from(buffer),
      sizeBytes: buffer.byteLength,
      mimeType: data.type || undefined,
    };
  }

  async delete(key: string): Promise<void> {
    assertSafeStorageKey(key);
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    assertSafeStorageKey(key);
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(
        `Supabase signed URL failed: ${error?.message ?? "missing url"}`,
      );
    }
    return data.signedUrl;
  }
}

let logged = false;

function resolveStorageMode(): "local" | "supabase" | "auto" {
  const mode = (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase();
  if (mode === "supabase" || mode === "auto" || mode === "local") {
    return mode;
  }
  return "local";
}

/**
 * Soft bucket access check — never logs credentials.
 * Returns false when Admin/Storage is unavailable or the bucket is missing.
 */
export async function verifySupabaseStorageAccess(): Promise<{
  ok: boolean;
  reason: string;
}> {
  if (!isSupabaseStorageReady()) {
    return {
      ok: false,
      reason: "supabase_admin_credentials_unavailable",
    };
  }

  const client = tryGetSupabaseAdminClient();
  if (!client) {
    return { ok: false, reason: "supabase_admin_client_unavailable" };
  }

  const bucket = supabaseConfig.storageBucket;
  const { data, error } = await client.storage.getBucket(bucket);
  if (error || !data) {
    return {
      ok: false,
      reason: error?.message
        ? `bucket_access_failed:${error.message.slice(0, 120)}`
        : "bucket_missing",
    };
  }
  return { ok: true, reason: "ok" };
}

export function createStorageProvider(): StorageProvider {
  const mode = resolveStorageMode();
  const preferSupabase = mode === "supabase" || mode === "auto";

  if (preferSupabase) {
    const client = tryGetSupabaseAdminClient();
    const bucket = supabaseConfig.storageBucket;

    if (client) {
      if (!logged) {
        logged = true;
        console.log(`[storage] Provider: supabase (bucket=${bucket})`);
      }
      return new SupabaseStorageProvider(client, bucket);
    }

    if (mode === "supabase") {
      console.warn(
        "[storage] STORAGE_PROVIDER=supabase but usable service-role credentials are missing — falling back to local",
      );
    }
  }

  const root = process.env.LOCAL_STORAGE_PATH?.trim();
  const provider = new LocalStorageProvider(root);
  if (!logged) {
    logged = true;
    console.log(`[storage] Provider: local (${provider.root})`);
  }
  return provider;
}

export const storageProvider = createStorageProvider();

/** Non-secret active provider name for connectivity reports. */
export function getActiveStorageProviderName(): string {
  return storageProvider.name;
}
