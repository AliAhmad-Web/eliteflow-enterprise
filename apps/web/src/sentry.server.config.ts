import * as Sentry from "@sentry/nextjs";

import {
  buildWebSentryInitOptions,
  getWebServerSentryDsn,
} from "@/config/sentry.config";

Sentry.init({
  ...buildWebSentryInitOptions(getWebServerSentryDsn()),
});
