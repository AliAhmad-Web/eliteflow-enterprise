import type { Metadata } from "next";

import { LazyCalendarPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return <LazyCalendarPage />;
}
