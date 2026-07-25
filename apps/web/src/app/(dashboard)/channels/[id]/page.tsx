import type { Metadata } from "next";

import { ChannelChatPageContent } from "@/features/communication/components/channel-chat-page-content";

export const metadata: Metadata = { title: "Channel" };

export default async function ChannelChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChannelChatPageContent channelId={id} />;
}
