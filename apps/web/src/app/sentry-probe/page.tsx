import * as Sentry from "@sentry/nextjs";
import { notFound } from "next/navigation";

import { SentryProbeClient } from "./sentry-probe-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function SentryProbePage() {
  if (process.env.NEXT_PUBLIC_SENTRY_PROBE !== "true") {
    notFound();
  }

  const client = Sentry.getClient();
  if (!client) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <p id="sentry-client-initialized">false</p>
        <p id="sentry-flush-ok">false</p>
        <p>Sentry is not initialized; probe was not sent.</p>
      </main>
    );
  }

  const error = new Error("EliteFlow Sentry production probe");
  error.name = "SentryProductionProbeError";
  const eventId = Sentry.captureException(error, {
    tags: {
      eliteflow_probe: "sentry",
      source: "web-server",
    },
  });
  const flushed = await Sentry.flush(5000);

  return (
    <>
      <p id="sentry-client-initialized" className="sr-only">
        true
      </p>
      <p id="sentry-flush-ok" className="sr-only">
        {flushed ? "true" : "false"}
      </p>
      <p id="sentry-server-event-id" className="sr-only">
        {eventId}
      </p>
      <SentryProbeClient />
    </>
  );
}
