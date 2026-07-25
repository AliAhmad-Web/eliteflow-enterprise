import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, unlink, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  readonly root: string;

  constructor(rootDir?: string) {
    this.root = rootDir
      ? path.resolve(rootDir)
      : path.resolve(process.cwd(), "storage", "uploads");
  }

  private resolveKeyPath(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const folder = input.folderKey?.replace(/\\/g, "/") || "general";
    const key = path
      .join(folder, `${randomUUID()}-${sanitizeFileName(input.originalName)}`)
      .replace(/\\/g, "/");
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
    const folder = input.folderKey?.replace(/\\/g, "/") || "general";
    const key = `${folder}/${randomUUID()}-${sanitizeFileName(input.originalName)}`;

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
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
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

export function createStorageProvider(): StorageProvider {
  const mode = (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase();

  if (mode === "supabase") {
    const url = process.env.SUPABASE_URL?.trim();
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "files";

    if (url && key) {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      if (!logged) {
        logged = true;
        console.log(`[storage] Provider: supabase (bucket=${bucket})`);
      }
      return new SupabaseStorageProvider(client, bucket);
    }

    console.warn(
      "[storage] STORAGE_PROVIDER=supabase but credentials missing — falling back to local",
    );
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

export type VirusScanEngine = "noop" | "clamav" | "cloud";

export interface VirusScanResult {
  clean: boolean;
  engine: VirusScanEngine;
  scannedAt: string;
  threatName?: string;
}

/**
 * Virus-scan architecture hook (prepare-only).
 * - Development / unset: no-op pass-through
 * - VIRUS_SCAN_ENGINE=clamav|cloud: reserved for future scanner adapters
 */
export async function runVirusScanHook(_input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}): Promise<VirusScanResult> {
  const raw = process.env.VIRUS_SCAN_ENGINE?.trim().toLowerCase() ?? "noop";
  const engine: VirusScanEngine =
    raw === "clamav" || raw === "cloud" ? raw : "noop";

  if (engine === "clamav" || engine === "cloud") {
    // Adapter placeholder — wire ClamAV / cloud AV SDK in a later phase.
    console.warn(
      `[virus-scan] Engine "${engine}" not implemented; treating as clean.`,
    );
  }

  return {
    clean: true,
    engine,
    scannedAt: new Date().toISOString(),
  };
}
