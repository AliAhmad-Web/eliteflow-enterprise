import { notFound } from "next/navigation";

import { SentryProbeClient } from "./sentry-probe-client";

export default function SentryProbePage() {
  if (process.env.NEXT_PUBLIC_SENTRY_PROBE !== "true") {
    notFound();
  }

  return <SentryProbeClient />;
}
