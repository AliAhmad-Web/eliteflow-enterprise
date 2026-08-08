import type { Metadata } from "next";

import { LazyWorkspacePage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = {
  title: "My Workspace",
};

export default function WorkspacePage() {
  return <LazyWorkspacePage />;
}
