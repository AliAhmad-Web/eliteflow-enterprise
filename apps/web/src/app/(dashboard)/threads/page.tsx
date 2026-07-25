import type { Metadata } from "next";

import { ThreadsPageContent } from "@/features/communication/components/threads-page-content";

export const metadata: Metadata = { title: "Threads" };

export default function ThreadsPage() {
  return <ThreadsPageContent />;
}
