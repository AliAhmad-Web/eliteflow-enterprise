"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { isPerformanceAdvBundleEnabled } from "@/features/performance";

import { TeamPageContent as TeamPageContentEager } from "./team-page-content";

const TeamPageContentLazy = dynamic(
  () => import("./team-page-content").then((m) => m.TeamPageContent),
  {
    ssr: false,
    loading: () => (
      <LoadingState label="Loading team" className="min-h-[40vh] border-0" />
    ),
  },
);

/**
 * Team shell: eager by default; dynamic import when PERFORMANCE_ADV_BUNDLE is ON.
 *
 * Always wait for client mount before rendering query-driven content. Team stats
 * are restored from localStorage only in the browser, which otherwise causes a
 * hydration mismatch (server LoadingState vs client StatCards).
 */
export function TeamPageContentGate() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <LoadingState label="Loading team" className="min-h-[40vh] border-0" />
    );
  }

  if (isPerformanceAdvBundleEnabled()) {
    return <TeamPageContentLazy />;
  }
  return <TeamPageContentEager />;
}
