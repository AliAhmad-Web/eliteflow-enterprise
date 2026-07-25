import type { Metadata } from "next";

import { AnnouncementsPageContent } from "@/features/communication/components/announcements-page-content";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return <AnnouncementsPageContent />;
}
