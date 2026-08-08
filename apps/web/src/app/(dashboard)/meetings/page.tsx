import type { Metadata } from "next";

import { LazyMeetingsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return <LazyMeetingsPage />;
}
