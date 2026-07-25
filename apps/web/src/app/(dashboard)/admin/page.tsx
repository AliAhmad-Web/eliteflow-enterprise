import type { Metadata } from "next";

import { AdminPageClient } from "@/features/dashboard/components/admin-page-client";

export const metadata: Metadata = {
  title: "Admin Console",
};

export default function AdminPage() {
  return <AdminPageClient />;
}
