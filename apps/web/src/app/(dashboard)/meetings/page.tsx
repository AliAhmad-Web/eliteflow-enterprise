import type { Metadata } from "next";

import { MeetingsPageContent } from "@/features/communication/components/meetings-page-content";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return <MeetingsPageContent />;
}
