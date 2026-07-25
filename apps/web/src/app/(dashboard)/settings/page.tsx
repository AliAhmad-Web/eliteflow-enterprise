import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsCenterPageContent } from "@/features/settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsCenterPageContent />
    </Suspense>
  );
}
