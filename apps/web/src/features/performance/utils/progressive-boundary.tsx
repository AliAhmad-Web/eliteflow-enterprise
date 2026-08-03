"use client";

import { Suspense, type ReactNode } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { isPerformanceAdvProgressiveRenderEnabled } from "@/features/performance/feature-flags";

type ProgressiveBoundaryProps = {
  children: ReactNode;
  label?: string;
};

/**
 * When PERFORMANCE_ADV_PROGRESSIVE_RENDER is ON → Suspense with loading fallback.
 * When OFF → children only (bit-identical to pre–Phase-5).
 */
export function ProgressiveBoundary({
  children,
  label = "Loading",
}: ProgressiveBoundaryProps) {
  if (!isPerformanceAdvProgressiveRenderEnabled()) {
    return children;
  }

  return (
    <Suspense
      fallback={
        <LoadingState label={label} className="min-h-[40vh] border-0" />
      }
    >
      {children}
    </Suspense>
  );
}
