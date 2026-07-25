import type { Metadata } from "next";

import { ClientsPageContent } from "@/features/clients/components/clients-page-content";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return <ClientsPageContent />;
}
