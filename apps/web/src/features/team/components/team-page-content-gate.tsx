"use client";

import dynamic from "next/dynamic";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { isPerformanceAdvBundleEnabled } from "@/features/performance";

import { TeamPageContent as TeamPageContentEager } from "./team-page-content";

const TeamPageContentLazy = dynamic(
  () =>
    import("./team-page-content").then((m) => m.TeamPageContent),
  {
    loading: () => (
      <LoadingState label="Loading team" className="min-h-[40vh] border-0" />
    ),
  },
);

/**
 * Team shell: eager by default; dynamic import when PERFORMANCE_ADV_BUNDLE is ON.
 * Keep-alive registry continues to lazy-load the same chunk for route transitions.
 */
export function TeamPageContentGate() {
  if (isPerformanceAdvBundleEnabled()) {
    return <TeamPageContentLazy />;
  }
  return <TeamPageContentEager />;
}
