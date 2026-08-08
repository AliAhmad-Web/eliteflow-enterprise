import type { Metadata } from "next";

import { LazyThreadsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Threads" };

export default function ThreadsPage() {
  return <LazyThreadsPage />;
}
