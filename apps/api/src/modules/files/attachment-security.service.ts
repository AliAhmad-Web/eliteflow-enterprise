import {
  buildInternalManagedFileDownloadPath,
  hasForbiddenAttachmentUrlScheme,
  parseInternalManagedFileId,
} from "@enterprise/shared";

import { FILES_ERROR_CODES, FilesError } from "./files.errors.js";
import { filesService, type FilesActor } from "./files.service.js";

export interface AttachmentSecurityActor {
  userId: string;
  role: string;
  email?: string;
  companyId?: string | null;
  permissions?: string[];
}

/** Raw attachment payload accepted by modules before hardening. */
export interface AttachmentSecurityInput {
  fileName?: string | null;
  fileUrl?: string | null;
  storageUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  managedFileId?: string | null;
  durationSeconds?: number | null;
  waveformJson?: string | null;
}

/** Normalized, attachable managed-file reference. */
export interface SecuredAttachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number | null;
  managedFileId: string;
  durationSeconds?: number | null;
  waveformJson?: string | null;
}

function toFilesActor(actor: AttachmentSecurityActor): FilesActor {
  return {
    userId: actor.userId,
    role: actor.role,
    email: actor.email ?? "",
    companyId: actor.companyId ?? null,
    permissions: actor.permissions ?? [],
  };
}

function reject(message: string, status = 400): never {
  throw new FilesError(message, status, FILES_ERROR_CODES.VALIDATION);
}

function assertNoForbiddenScheme(url: string | null | undefined, field: string): void {
  if (!url) return;
  if (hasForbiddenAttachmentUrlScheme(url)) {
    reject(
      `${field} uses a forbidden URL scheme. Attach a File Manager file instead.`,
    );
  }
}

function externalAttachmentsAllowed(): boolean {
  const raw = process.env.ATTACHMENT_ALLOW_EXTERNAL_URLS?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/**
 * Enterprise Attachment Security Layer (F-15).
 * All modules that accept attachments must call this service.
 */
export class AttachmentSecurityService {
  /**
   * Secure a single attachment candidate.
   * Allows only managedFileId or internal File Manager URLs (by default).
   */
  async secureAttachment(
    input: AttachmentSecurityInput,
    actor: AttachmentSecurityActor,
  ): Promise<SecuredAttachment> {
    assertNoForbiddenScheme(input.fileUrl, "fileUrl");
    assertNoForbiddenScheme(input.storageUrl, "storageUrl");

    let managedFileId =
      input.managedFileId?.trim().toLowerCase() ||
      (input.fileUrl ? parseInternalManagedFileId(input.fileUrl) : null) ||
      (input.storageUrl ? parseInternalManagedFileId(input.storageUrl) : null);

    if (!managedFileId) {
      const candidateUrl = input.fileUrl || input.storageUrl;
      if (candidateUrl && externalAttachmentsAllowed()) {
        // Reserved for future allowlisted HTTPS — still disabled unless explicitly configured.
        try {
          const parsed = new URL(candidateUrl);
          if (parsed.protocol !== "https:") {
            reject("External attachment URLs must use HTTPS");
          }
        } catch {
          reject("Invalid attachment URL");
        }
        reject(
          "External attachment URLs are not enabled. Upload via File Manager and attach the managed file.",
        );
      }

      reject(
        "Attachments must reference a File Manager file (managedFileId or internal /api/v1/files/:id/download URL)",
      );
    }

    const file = await filesService.assertManagedFileForAttachment(
      toFilesActor(actor),
      managedFileId,
    );

    const fileName =
      (input.fileName?.trim() || file.name || file.originalName || "file").slice(
        0,
        255,
      );

    return {
      fileName,
      fileUrl: buildInternalManagedFileDownloadPath(file.id),
      mimeType: (file.mimeType ?? input.mimeType ?? "application/octet-stream").slice(
        0,
        120,
      ),
      sizeBytes:
        input.sizeBytes != null
          ? input.sizeBytes
          : Number(file.sizeBytes ?? 0) || null,
      managedFileId: file.id,
      durationSeconds: input.durationSeconds ?? null,
      waveformJson: input.waveformJson ?? null,
    };
  }

  async secureAttachments(
    inputs: AttachmentSecurityInput[] | undefined | null,
    actor: AttachmentSecurityActor,
  ): Promise<SecuredAttachment[]> {
    if (!inputs?.length) return [];
    const secured: SecuredAttachment[] = [];
    for (const item of inputs) {
      secured.push(await this.secureAttachment(item, actor));
    }
    return secured;
  }

  /** Secure a list of bare URLs (e.g. calendar attachmentUrls). */
  async secureAttachmentUrls(
    urls: string[] | undefined | null,
    actor: AttachmentSecurityActor,
  ): Promise<string[]> {
    if (!urls?.length) return [];
    const secured = await this.secureAttachments(
      urls.map((fileUrl) => ({ fileUrl, fileName: "attachment" })),
      actor,
    );
    return secured.map((item) => item.fileUrl);
  }
}

export const attachmentSecurityService = new AttachmentSecurityService();
