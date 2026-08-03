import type { Metadata } from "next";

import { EmailAutomationPageContent } from "@/features/communication/components/email-automation-workspace";

export const metadata: Metadata = { title: "Email" };

export default function EmailAutomationPage() {
  return <EmailAutomationPageContent />;
}
