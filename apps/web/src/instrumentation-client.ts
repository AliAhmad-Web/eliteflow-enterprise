import * as Sentry from "@sentry/nextjs";

import {
  buildWebSentryInitOptions,
  getWebClientSentryDsn,
} from "@/config/sentry.config";

const dsn = getWebClientSentryDsn();

Sentry.init({
  ...buildWebSentryInitOptions(dsn),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
