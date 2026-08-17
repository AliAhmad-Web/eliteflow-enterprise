import * as Sentry from "@sentry/node";

import { buildApiSentryOptions, isApiSentryEnabled } from "./config/sentry.config.js";

if (isApiSentryEnabled()) {
  Sentry.init(buildApiSentryOptions());
}
