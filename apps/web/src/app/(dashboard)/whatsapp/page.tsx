import type { Metadata } from "next";

import { WhatsappPageContent } from "@/features/communication/components/whatsapp-page-content";

export const metadata: Metadata = { title: "WhatsApp" };

export default function WhatsappPage() {
  return <WhatsappPageContent />;
}
