/**
 * Cloudinary client for File Manager media uploads (when Integration Center is connected).
 * Does not replace Supabase/local storage — optional media CDN path.
 */

import { parseCloudinarySecret } from "../api-keys/api-key-probes.js";
import { apiKeyProviderService } from "../api-keys/api-key-provider.service.js";

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes: number;
  folder: string | null;
}

export async function isCloudinaryConnected(): Promise<boolean> {
  const key = await apiKeyProviderService.getDecryptedApiKey("cloudinary");
  return Boolean(key);
}

export async function uploadToCloudinary(input: {
  buffer: Buffer;
  folder?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
  fileName?: string;
}): Promise<CloudinaryUploadResult> {
  const secret = await apiKeyProviderService.getDecryptedApiKey("cloudinary");
  if (!secret) {
    throw new Error("Cloudinary is not connected in Integration Center.");
  }
  const parsed = parseCloudinarySecret(secret);
  if (!parsed) {
    throw new Error("Invalid Cloudinary credentials in vault.");
  }

  const resourceType = input.resourceType ?? "auto";
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = input.folder?.replace(/^\/+|\/+$/g, "") || "eliteflow";

  // Unsigned upload requires API signature — use basic auth admin upload.
  const form = new FormData();
  const bytes = new Uint8Array(input.buffer);
  form.append(
    "file",
    new Blob([bytes]),
    input.fileName ?? "upload.bin",
  );
  form.append("folder", folder);
  form.append("timestamp", String(timestamp));

  const auth = Buffer.from(`${parsed.apiKey}:${parsed.apiSecret}`).toString(
    "base64",
  );
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(parsed.cloudName)}/${resourceType}/upload`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
      body: form,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed: ${text.slice(0, 240)}`);
  }

  const data = (await response.json()) as {
    public_id: string;
    secure_url: string;
    resource_type: string;
    bytes: number;
    folder?: string;
  };

  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
    resourceType: data.resource_type,
    bytes: data.bytes,
    folder: data.folder ?? folder,
  };
}

export async function buildCloudinarySecureUrl(
  publicId: string,
  options?: { resourceType?: string },
): Promise<string | null> {
  const secret = await apiKeyProviderService.getDecryptedApiKey("cloudinary");
  if (!secret) return null;
  const parsed = parseCloudinarySecret(secret);
  if (!parsed) return null;
  const resourceType = options?.resourceType ?? "image";
  return `https://res.cloudinary.com/${parsed.cloudName}/${resourceType}/upload/${publicId}`;
}
