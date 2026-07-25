"use client";

import { Download, FileText, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  formatFileSize,
  isImageAttachment,
} from "../utils/message-content";

type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

interface MessageAttachmentsProps {
  attachments: Attachment[];
  isOwn?: boolean;
}

export function MessageAttachments({
  attachments,
  isOwn = false,
}: MessageAttachmentsProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const images = attachments.filter((att) =>
    isImageAttachment(att.mimeType, att.fileName),
  );
  const files = attachments.filter(
    (att) => !isImageAttachment(att.mimeType, att.fileName),
  );

  return (
    <>
      <div className="mt-2 space-y-2">
        {images.length > 0 ? (
          <div
            className={cn(
              "grid gap-1.5",
              images.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {images.map((att) => (
              <button
                key={att.id}
                type="button"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-black/5 text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxUrl(att.fileUrl);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.fileUrl}
                  alt={att.fileName}
                  className="max-h-56 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 text-[10px] text-white">
                  {att.fileName}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {files.map((att) => (
          <a
            key={att.id}
            href={att.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors",
              isOwn
                ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
                : "border-border bg-background/70 hover:bg-accent/50",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isOwn ? "bg-primary-foreground/15" : "bg-muted",
              )}
            >
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{att.fileName}</p>
              <p className="text-[10px] opacity-70">
                {att.mimeType || "File"}
                {att.sizeBytes ? ` · ${formatFileSize(att.sizeBytes)}` : ""}
              </p>
            </div>
            <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </a>
        ))}
      </div>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Attachment preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
