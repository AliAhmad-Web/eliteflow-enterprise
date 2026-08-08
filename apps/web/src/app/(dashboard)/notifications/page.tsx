import type { Metadata } from "next";

import { LazyNotificationsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <LazyNotificationsPage />;
}
