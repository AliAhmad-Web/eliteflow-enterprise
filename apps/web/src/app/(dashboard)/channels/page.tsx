import type { Metadata } from "next";

import { ChannelsPageContent } from "@/features/communication/components/channels-page-content";

export const metadata: Metadata = { title: "Channels" };

export default function ChannelsPage() {
  return <ChannelsPageContent />;
}
