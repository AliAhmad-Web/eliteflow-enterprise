/**
 * Lightweight schema/contract checks for global search (no DB).
 * Run: npx tsx apps/api/scripts/verify-global-search-contract.ts
 */
import assert from "node:assert/strict";

import {
  GLOBAL_SEARCH_SCOPES,
  SEARCH_API_PREFIX,
  globalSearchHitSchema,
  globalSearchQuerySchema,
  globalSearchResponseSchema,
} from "@enterprise/shared";

const query = globalSearchQuerySchema.parse({
  q: "acme",
  scope: "all",
  limit: "8",
});
assert.equal(query.q, "acme");
assert.equal(query.scope, "all");
assert.equal(query.limit, 8);

assert.equal(SEARCH_API_PREFIX, "/api/v1/search");
assert.ok(GLOBAL_SEARCH_SCOPES.includes("projects"));

const hit = globalSearchHitSchema.parse({
  id: "00000000-0000-4000-8000-000000000001",
  type: "project",
  title: "Acme Rollout",
  subtitle: "Active",
  href: "/projects?open=00000000-0000-4000-8000-000000000001",
});
assert.equal(hit.type, "project");
assert.match(hit.href, /^\/projects\?open=/);

const response = globalSearchResponseSchema.parse({
  q: "acme",
  total: 1,
  groups: {
    users: [],
    employees: [],
    clients: [],
    projects: [hit],
    tasks: [],
    files: [],
    messages: [],
    notifications: [],
  },
});
assert.equal(response.total, 1);
assert.equal(response.groups.projects.length, 1);

assert.throws(() => globalSearchQuerySchema.parse({ q: "" }));

console.log("verify-global-search-contract: OK");
