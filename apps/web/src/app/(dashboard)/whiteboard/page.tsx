import type { Metadata } from "next";

import { WhiteboardPageContent } from "@/features/whiteboard/components/whiteboard-page-content";

export const metadata: Metadata = { title: "Whiteboard" };

export default function WhiteboardPage() {
  return <WhiteboardPageContent />;
}
