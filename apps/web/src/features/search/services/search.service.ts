import {
  SEARCH_API_PREFIX,
  type GlobalSearchQueryInput,
  type GlobalSearchResponse,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQuery(input: GlobalSearchQueryInput): string {
  const params = new URLSearchParams();
  params.set("q", input.q);
  params.set("scope", input.scope ?? "all");
  params.set("limit", String(input.limit ?? 8));
  return `?${params.toString()}`;
}

export const searchService = {
  search(input: GlobalSearchQueryInput) {
    return apiRequest<GlobalSearchResponse>(
      `${SEARCH_API_PREFIX}${toQuery(input)}`,
      { auth: true },
    );
  },
};
