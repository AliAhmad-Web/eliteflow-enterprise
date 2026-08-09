/**
 * Contract checks for deep-link param stripping (modal close must no-op when clean).
 * Run: npx tsx apps/web/scripts/verify-deep-link-strip.ts
 */
import assert from "node:assert/strict";

import {
  DEEP_LINK_PARAMS,
  stripDeepLinkSearchParams,
} from "../src/features/notifications/utils/deep-link-params";

{
  const empty = stripDeepLinkSearchParams(new URLSearchParams("page=2&q=acme"));
  assert.equal(empty.changed, false);
  assert.equal(empty.next.toString(), "page=2&q=acme");
}

{
  const withOpen = stripDeepLinkSearchParams(
    new URLSearchParams(
      `${DEEP_LINK_PARAMS.OPEN}=abc&${DEEP_LINK_PARAMS.FROM}=notification&${DEEP_LINK_PARAMS.NOTIFICATION_ID}=n1&page=2`,
    ),
  );
  assert.equal(withOpen.changed, true);
  assert.equal(withOpen.next.get(DEEP_LINK_PARAMS.OPEN), null);
  assert.equal(withOpen.next.get(DEEP_LINK_PARAMS.FROM), null);
  assert.equal(withOpen.next.get("page"), "2");
}

{
  const calendar = stripDeepLinkSearchParams(new URLSearchParams("event=e1&foo=1"));
  assert.equal(calendar.changed, true);
  assert.equal(calendar.next.get("event"), null);
  assert.equal(calendar.next.get("foo"), "1");
}

{
  const aiDoc = stripDeepLinkSearchParams(
    new URLSearchParams(`${DEEP_LINK_PARAMS.FROM}=notification&id=doc1`),
  );
  assert.equal(aiDoc.changed, true);
  assert.equal(aiDoc.next.get("id"), null);
}

console.log("verify-deep-link-strip: OK");
