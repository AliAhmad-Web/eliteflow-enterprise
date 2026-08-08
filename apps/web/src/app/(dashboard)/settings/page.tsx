import type { Metadata } from "next";
import { Suspense } from "react";

import { LazySettingsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <LazySettingsPage />
    </Suspense>
  );
}
