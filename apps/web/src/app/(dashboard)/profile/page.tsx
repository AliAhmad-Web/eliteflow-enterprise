import type { Metadata } from "next";
import { Suspense } from "react";

import { LazyProfilePage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <LazyProfilePage />
    </Suspense>
  );
}
