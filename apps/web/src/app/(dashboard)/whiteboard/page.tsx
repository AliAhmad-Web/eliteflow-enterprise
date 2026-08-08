import type { Metadata } from "next";

import { LazyWhiteboardPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Whiteboard" };

export default function WhiteboardPage() {
  return <LazyWhiteboardPage />;
}
