"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";

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
 * Always dynamically import Team (~77KB). Wait for client mount before rendering
 * query-driven content to avoid hydration mismatch with localStorage-backed stats.
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

  return <TeamPageContentLazy />;
}
