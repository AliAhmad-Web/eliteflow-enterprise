/**
 * Enterprise Module Resolver.
 * Selects relevant business modules from metadata + runtime context.
 * Never queries databases or executes module business logic.
 */

import type { AiEnterpriseModuleDefinition } from "./module-definition.js";
import type { AiEnterpriseModuleSummary } from "./module-definition.js";
import {
  enterpriseModuleRegistry,
  type AiEnterpriseModuleRegistry,
} from "./module-registry.js";
import { toModuleSummary } from "./module-capabilities.js";
import {
  resolveEntityTypeHints,
  resolveIntentHints,
  type AiModuleResolutionContext,
} from "./module-context.js";

export interface AiSelectedModules {
  readonly modules: readonly AiEnterpriseModuleSummary[];
  readonly confidence: number;
  readonly reasons: readonly string[];
}

export interface ResolveSelectedModulesInput extends AiModuleResolutionContext {
  readonly registry?: AiEnterpriseModuleRegistry;
  readonly maxModules?: number;
}

interface ScoredModule {
  readonly module: AiEnterpriseModuleDefinition;
  readonly score: number;
  readonly reasons: string[];
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function sanitizeReason(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 120);
}

function scoreModule(
  module: AiEnterpriseModuleDefinition,
  input: ResolveSelectedModulesInput,
  intentHints: readonly string[],
  entityTypes: readonly string[],
): ScoredModule {
  let score = module.priority / 100;
  const reasons: string[] = [];

  const moduleKey = input.activeContext.module?.toLowerCase() ?? "";
  if (
    moduleKey &&
    module.moduleKeys?.some((key) => key.toLowerCase() === moduleKey)
  ) {
    score += 0.35;
    reasons.push(`module-key:${module.name}`);
  }

  const surface = input.activeContext.surface?.toUpperCase() ?? "";
  if (
    surface &&
    module.surfaces?.some((item) => item.toUpperCase() === surface)
  ) {
    score += 0.15;
    reasons.push(`surface:${module.name}`);
  }

  const agentType = input.activeAgent?.type?.toLowerCase() ?? "";
  if (
    agentType &&
    module.preferredAgentTypes?.some(
      (item) => item.toLowerCase() === agentType,
    )
  ) {
    score += 0.2;
    reasons.push(`agent:${module.name}`);
  }

  for (const entity of entityTypes) {
    if (
      module.supportedEntities.some(
        (supported) =>
          supported.toLowerCase() === entity ||
          entity.includes(supported.toLowerCase()),
      )
    ) {
      score += 0.25;
      reasons.push(`entity:${module.name}`);
      break;
    }
  }

  for (const hint of intentHints) {
    const hit =
      module.name.toLowerCase().includes(hint) ||
      module.moduleKeys?.some((key) => key.toLowerCase().includes(hint)) ||
      module.supportedEntities.some((entity) =>
        entity.toLowerCase().includes(hint),
      ) ||
      module.supportedQueries.some((query) =>
        query.toLowerCase().includes(hint),
      );
    if (hit) {
      score += 0.12;
      reasons.push(`intent:${module.name}`);
      break;
    }
  }

  const queryModuleId = input.businessQuery?.moduleId?.toLowerCase() ?? "";
  if (queryModuleId && module.id.toLowerCase() === queryModuleId) {
    score += 0.4;
    reasons.push(`business-query:${module.name}`);
  }

  if (module.availability === "limited") {
    score -= 0.05;
  }

  return {
    module,
    score,
    reasons: reasons.map(sanitizeReason),
  };
}

/**
 * Resolve immutable selected modules for the current runtime context.
 */
export function resolveSelectedModules(
  input: ResolveSelectedModulesInput,
): AiSelectedModules {
  const registry = input.registry ?? enterpriseModuleRegistry;
  const maxModules =
    typeof input.maxModules === "number" && input.maxModules > 0
      ? Math.min(Math.floor(input.maxModules), 8)
      : 4;

  const intentHints = resolveIntentHints(input);
  const entityTypes = resolveEntityTypeHints(
    input.activeContext,
    input.businessQuery,
  );

  const scored = registry
    .listEnabled()
    .map((module) => scoreModule(module, input, intentHints, entityTypes))
    .filter((item) => item.score >= 0.55)
    .sort((a, b) => b.score - a.score || b.module.priority - a.module.priority);

  const selected = scored.slice(0, maxModules);
  const modules = Object.freeze(
    selected.map((item) => toModuleSummary(item.module)),
  );

  const reasons = Object.freeze(
    [...new Set(selected.flatMap((item) => item.reasons))].slice(0, 12),
  );

  const topScore = selected[0]?.score ?? 0;
  const confidence = clampConfidence(
    selected.length === 0
      ? 0.35
      : 0.45 + Math.min(0.45, topScore / 2) + Math.min(0.1, selected.length * 0.02),
  );

  return Object.freeze({
    modules,
    confidence,
    reasons,
  });
}
