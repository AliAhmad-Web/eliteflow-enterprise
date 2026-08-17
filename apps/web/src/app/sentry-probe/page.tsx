import * as Sentry from "@sentry/nextjs";
import { notFound } from "next/navigation";

import { SentryProbeClient } from "./sentry-probe-client";

export default async function SentryProbePage() {
  if (process.env.NEXT_PUBLIC_SENTRY_PROBE !== "true") {
    notFound();
  }

  const error = new Error("EliteFlow Sentry production probe");
  error.name = "SentryProductionProbeError";
  const eventId = Sentry.captureException(error, {
    tags: {
      eliteflow_probe: "sentry",
      source: "web-server",
    },
  });
  await Sentry.flush(2000);

  return (
    <>
      <p id="sentry-server-event-id" className="sr-only">
        {eventId}
      </p>
      <SentryProbeClient />
    </>
  );
}
