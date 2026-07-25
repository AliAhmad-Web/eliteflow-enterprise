import type { Metadata } from "next";

import { ActivityFeedPageContent } from "@/features/communication/components/activity-feed-page-content";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return <ActivityFeedPageContent />;
}
