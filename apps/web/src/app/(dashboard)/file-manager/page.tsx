import type { Metadata } from "next";

import { FileManagerPageContent } from "@/features/files/components/file-manager-page-content";

export const metadata: Metadata = { title: "File Manager" };

export default function FileManagerPage() {
  return <FileManagerPageContent />;
}
