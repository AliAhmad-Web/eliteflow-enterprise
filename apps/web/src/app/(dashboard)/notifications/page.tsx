import type { Metadata } from "next";

import { NotificationsPageContent } from "@/features/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationsPageContent />;
}
