/**
 * Shared factory for read-only Module Data Providers.
 */

import type { AiModuleDataProvider } from "./module-data-provider.js";
import type { AiModuleDataContext } from "./module-data-context.js";
import type { AiModuleDataRequest } from "./module-data-request.js";
import type { AiModuleDataResponse } from "./module-data-response.js";
import { assertCanRead, emptyResponse } from "./module-data-helpers.js";

export interface CreateModuleDataProviderInput {
  readonly moduleId: string;
  readonly name: string;
  readonly permission: string | null;
  readonly capabilities: readonly string[];
  readonly fetchSummaries: (
    context: AiModuleDataContext,
  ) => Promise<AiModuleDataResponse>;
}

export function createModuleDataProvider(
  input: CreateModuleDataProviderInput,
): AiModuleDataProvider {
  const metadata = Object.freeze({
    moduleId: input.moduleId,
    name: input.name,
    readOnly: true as const,
    capabilities: Object.freeze([...input.capabilities]),
  });

  return Object.freeze({
    moduleId: input.moduleId,
    supportsQueries(queries: readonly string[]): boolean {
      if (queries.length === 0) return true;
      return queries.some((query) =>
        input.capabilities.some((capability) =>
          capability.toLowerCase().includes(query.toLowerCase()),
        ),
      );
    },
    async fetch(
      _request: AiModuleDataRequest,
      context: AiModuleDataContext,
    ): Promise<AiModuleDataResponse> {
      if (input.permission && !assertCanRead(context, input.permission)) {
        return emptyResponse(
          input.moduleId,
          input.name,
          "denied",
          "permission_or_privacy",
        );
      }
      if (context.policy.privacyMode || !context.userId?.trim()) {
        return emptyResponse(
          input.moduleId,
          input.name,
          "denied",
          "privacy_or_no_user",
        );
      }
      try {
        return await input.fetchSummaries(context);
      } catch {
        return emptyResponse(
          input.moduleId,
          input.name,
          "unavailable",
          "service_unavailable",
        );
      }
    },
    async health() {
      return "healthy" as const;
    },
    capabilities() {
      return metadata.capabilities;
    },
    metadata() {
      return metadata;
    },
  });
}

/**
 * Compose placeholder + service providers behind a runtime flag check.
 */
export function createSwitchableModuleDataProvider(input: {
  readonly placeholder: AiModuleDataProvider;
  readonly service: AiModuleDataProvider;
  readonly isServiceEnabled: () => boolean;
}): AiModuleDataProvider {
  const { placeholder, service, isServiceEnabled } = input;
  return Object.freeze({
    moduleId: placeholder.moduleId,
    supportsQueries(queries: readonly string[]): boolean {
      return isServiceEnabled()
        ? service.supportsQueries(queries)
        : placeholder.supportsQueries(queries);
    },
    async fetch(request: AiModuleDataRequest, context: AiModuleDataContext) {
      return isServiceEnabled()
        ? service.fetch(request, context)
        : placeholder.fetch(request, context);
    },
    async health() {
      return isServiceEnabled() ? service.health() : placeholder.health();
    },
    capabilities() {
      return isServiceEnabled()
        ? service.capabilities()
        : placeholder.capabilities();
    },
    metadata() {
      return isServiceEnabled() ? service.metadata() : placeholder.metadata();
    },
  });
}
