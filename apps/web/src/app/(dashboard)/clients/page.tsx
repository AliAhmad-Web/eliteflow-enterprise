import type { Metadata } from "next";

import { LazyClientsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return <LazyClientsPage />;
}
