import type { Metadata } from "next";

import { LazyAnnouncementsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return <LazyAnnouncementsPage />;
}
