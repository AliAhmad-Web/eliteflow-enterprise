import type { Metadata } from "next";
import dynamic from "next/dynamic";

const FileViewerPageContent = dynamic(
  () =>
    import("@/features/files/components/file-viewer/file-viewer-page-content").then(
      (m) => m.FileViewerPageContent,
    ),
  { loading: () => null },
);

export const metadata: Metadata = { title: "File Viewer" };

export default function FileViewerPage() {
  return <FileViewerPageContent />;
}
