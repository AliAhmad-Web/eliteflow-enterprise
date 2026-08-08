import type { Metadata } from "next";

import { LazyChannelsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Channels" };

export default function ChannelsPage() {
  return <LazyChannelsPage />;
}
