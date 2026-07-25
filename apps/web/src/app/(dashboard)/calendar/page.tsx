import type { Metadata } from "next";

import { CalendarPageContent } from "@/features/calendar/components/calendar-page-content";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return <CalendarPageContent />;
}
