import type { Metadata } from "next";

import { NotificationPermalinkContent } from "@/features/notifications/components/notification-permalink-content";

export const metadata: Metadata = { title: "Notification" };

export default function NotificationPermalinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <NotificationPermalinkContent params={params} />;
}
