import type { Metadata } from "next";

import { PortalPageClient } from "@/features/dashboard/components/portal-page-client";

export const metadata: Metadata = {
  title: "Client Portal",
};

export default function PortalPage() {
  return <PortalPageClient />;
}
