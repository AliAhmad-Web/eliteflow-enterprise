"use client";

import type { ManagedFile } from "@enterprise/shared";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";

import { isOfficeCategory, guessTextLanguage } from "./file-viewer.utils";
import type { PreviewBlobState } from "./use-file-preview-blob";
import { UnsupportedViewer } from "./viewers/unsupported-viewer";

const PdfViewer = dynamic(
  () =>
    import("./viewers/pdf-viewer").then((m) => ({ default: m.PdfViewer })),
  {
    ssr: false,
    loading: () => <ViewerSkeleton label="Loading PDF viewer" />,
  },
);

const ImageViewer = dynamic(
  () =>
    import("./viewers/image-viewer").then((m) => ({ default: m.ImageViewer })),
  {
    ssr: false,
    loading: () => <ViewerSkeleton label="Loading image viewer" />,
  },
);

const VideoViewer = dynamic(
  () =>
    import("./viewers/video-viewer").then((m) => ({ default: m.VideoViewer })),
  {
    ssr: false,
    loading: () => <ViewerSkeleton label="Loading video player" />,
  },
);

const AudioViewer = dynamic(
  () =>
    import("./viewers/audio-viewer").then((m) => ({ default: m.AudioViewer })),
  {
    ssr: false,
    loading: () => <ViewerSkeleton label="Loading audio player" />,
  },
);

const TextViewer = dynamic(
  () =>
    import("./viewers/text-viewer").then((m) => ({ default: m.TextViewer })),
  {
    ssr: false,
    loading: () => <ViewerSkeleton label="Loading text viewer" />,
  },
);

const OfficeViewer = dynamic(
  () =>
    import("./viewers/office-viewer").then((m) => ({
      default: m.OfficeViewer,
    })),
  { ssr: false },
);

interface FileViewerStageProps {
  file: ManagedFile;
  preview: PreviewBlobState;
  sidebarOpen: boolean;
  onDownload: () => void;
  onZoomChange: (zoom: number | null) => void;
  onStatusChange: (status: string) => void;
}

function ViewerSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-zinc-950">
      <LoadingState label={label} className="border-0 bg-transparent" />
    </div>
  );
}

export function FileViewerStage({
  file,
  preview,
  sidebarOpen,
  onDownload,
  onZoomChange,
  onStatusChange,
}: FileViewerStageProps) {
  const language = useMemo(() => guessTextLanguage(file), [file]);

  if (preview.status === "loading" || preview.status === "idle") {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-zinc-950">
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-zinc-800">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${preview.progress}%` }}
          />
        </div>
        <ViewerSkeleton label="Loading preview" />
      </div>
    );
  }

  if (preview.status === "error") {
    return (
      <UnsupportedViewer
        fileName={file.name}
        message={preview.error ?? "Could not load preview"}
        onDownload={onDownload}
      />
    );
  }

  if (isOfficeCategory(file.category) && !file.previewable) {
    return (
      <OfficeViewer
        fileName={file.name}
        category={file.category}
        onDownload={onDownload}
      />
    );
  }

  if (preview.status === "unsupported") {
    if (isOfficeCategory(file.category)) {
      return (
        <OfficeViewer
          fileName={file.name}
          category={file.category}
          onDownload={onDownload}
        />
      );
    }
    return (
      <UnsupportedViewer fileName={file.name} onDownload={onDownload} />
    );
  }

  if (file.category === "PDF" && preview.url) {
    return (
      <PdfViewer
        url={preview.url}
        fileName={file.name}
        onZoomChange={onZoomChange}
        onStatusChange={onStatusChange}
      />
    );
  }

  if (file.category === "IMAGE" && preview.url) {
    return (
      <ImageViewer
        url={preview.url}
        fileName={file.name}
        mimeType={file.mimeType}
        sizeBytes={file.sizeBytes}
        infoOpen={sidebarOpen}
        onZoomChange={onZoomChange}
      />
    );
  }

  if (file.category === "VIDEO" && preview.url) {
    return (
      <VideoViewer
        url={preview.url}
        fileName={file.name}
        onStatusChange={onStatusChange}
      />
    );
  }

  if (file.category === "AUDIO" && preview.url) {
    return (
      <AudioViewer
        url={preview.url}
        fileName={file.name}
        onStatusChange={onStatusChange}
      />
    );
  }

  if (file.category === "TEXT" && preview.text != null) {
    return (
      <TextViewer
        text={preview.text}
        fileName={file.name}
        language={language}
        onStatusChange={onStatusChange}
      />
    );
  }

  return (
    <UnsupportedViewer fileName={file.name} onDownload={onDownload} />
  );
}
