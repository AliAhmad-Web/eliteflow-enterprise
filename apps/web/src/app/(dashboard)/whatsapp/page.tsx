import type { Metadata } from "next";

import { LazyWhatsappPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "WhatsApp" };

export default function WhatsappPage() {
  return <LazyWhatsappPage />;
}
