import type { Metadata } from "next";

import { LazyAdminPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = {
  title: "Admin Console",
};

export default function AdminPage() {
  return <LazyAdminPage />;
}
