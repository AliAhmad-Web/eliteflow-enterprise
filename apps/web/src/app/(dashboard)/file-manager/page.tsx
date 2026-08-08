import type { Metadata } from "next";
import { Suspense } from "react";

import { LazyFileManagerPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "File Manager" };

export default function FileManagerPage() {
  return (
    <Suspense fallback={null}>
      <LazyFileManagerPage />
    </Suspense>
  );
}
