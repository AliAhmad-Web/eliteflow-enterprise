import type { Metadata } from "next";

import { LazyPortalPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = {
  title: "Client Portal",
};

export default function PortalPage() {
  return <LazyPortalPage />;
}
