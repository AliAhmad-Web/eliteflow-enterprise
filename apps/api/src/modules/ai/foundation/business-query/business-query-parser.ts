/**
 * Business Query Parser — extract intent / entity / filters from prompt text.
 * Heuristic keyword matching only. Never executes. Never loads data.
 */

import type { AiBusinessQueryIntent } from "./business-query-intent.js";
import type { AiBusinessQueryEntity } from "./business-query-entity.js";
import type { AiBusinessQueryFilter } from "./business-query-filter.js";

export interface ParsedBusinessQuerySignals {
  readonly intent: AiBusinessQueryIntent;
  readonly entity: AiBusinessQueryEntity | null;
  readonly filters: readonly AiBusinessQueryFilter[];
  readonly matchedIntentKeywords: readonly string[];
  readonly matchedEntityKeywords: readonly string[];
  readonly matchedFilterKeywords: readonly string[];
}

interface KeywordRule<T extends string> {
  readonly value: T;
  readonly keywords: readonly string[];
  readonly weight: number;
}

const INTENT_RULES: readonly KeywordRule<AiBusinessQueryIntent>[] =
  Object.freeze([
    {
      value: "count",
      keywords: Object.freeze(["how many", "count", "number of", "total"]),
      weight: 3,
    },
    {
      value: "search",
      keywords: Object.freeze(["search", "find", "look up", "lookup"]),
      weight: 3,
    },
    {
      value: "compare",
      keywords: Object.freeze(["compare", "versus", " vs ", "difference"]),
      weight: 3,
    },
    {
      value: "recommendation",
      keywords: Object.freeze([
        "recommend",
        "suggestion",
        "suggest",
        "advise",
      ]),
      weight: 3,
    },
    {
      value: "analytics",
      keywords: Object.freeze(["analytics", "metrics", "kpi", "dashboard"]),
      weight: 3,
    },
    {
      value: "insights",
      keywords: Object.freeze(["insight", "trend", "forecast"]),
      weight: 3,
    },
    {
      value: "progress",
      keywords: Object.freeze(["progress", "completion rate", "% complete"]),
      weight: 3,
    },
    {
      value: "status",
      keywords: Object.freeze(["status", "state of", "where is"]),
      weight: 2,
    },
    {
      value: "review",
      keywords: Object.freeze(["review", "approve", "approval", "pending approval"]),
      weight: 2,
    },
    {
      value: "open",
      keywords: Object.freeze(["open ", "outstanding", "unresolved"]),
      weight: 2,
    },
    {
      value: "details",
      keywords: Object.freeze(["detail", "details", "show me more", "explain"]),
      weight: 2,
    },
    {
      value: "summary",
      keywords: Object.freeze(["summary", "summarize", "overview", "digest"]),
      weight: 2,
    },
    {
      value: "list",
      keywords: Object.freeze([
        "list",
        "show",
        "display",
        "what are",
        "my ",
        "today's",
      ]),
      weight: 1,
    },
  ]);

const ENTITY_RULES: readonly KeywordRule<AiBusinessQueryEntity>[] =
  Object.freeze([
    {
      value: "task",
      keywords: Object.freeze(["task", "todo", "to-do", "to do"]),
      weight: 3,
    },
    {
      value: "project",
      keywords: Object.freeze(["project"]),
      weight: 3,
    },
    {
      value: "invoice",
      keywords: Object.freeze(["invoice", "billing"]),
      weight: 3,
    },
    {
      value: "finance",
      keywords: Object.freeze(["finance", "revenue", "payment"]),
      weight: 2,
    },
    {
      value: "employee",
      keywords: Object.freeze(["employee", "staff", "team member", "hr"]),
      weight: 3,
    },
    {
      value: "meeting",
      keywords: Object.freeze(["meeting", "appointment"]),
      weight: 3,
    },
    {
      value: "calendar",
      keywords: Object.freeze(["calendar", "schedule", "event"]),
      weight: 2,
    },
    {
      value: "document",
      keywords: Object.freeze(["document", "doc ", "docs"]),
      weight: 3,
    },
    {
      value: "report",
      keywords: Object.freeze(["report"]),
      weight: 3,
    },
    {
      value: "customer",
      keywords: Object.freeze(["customer", "client", "crm"]),
      weight: 3,
    },
    {
      value: "lead",
      keywords: Object.freeze(["lead", "prospect"]),
      weight: 3,
    },
    {
      value: "notification",
      keywords: Object.freeze(["notification", "alert", "unread"]),
      weight: 3,
    },
    {
      value: "file",
      keywords: Object.freeze(["file", "attachment", "storage"]),
      weight: 2,
    },
  ]);

const FILTER_RULES: readonly KeywordRule<AiBusinessQueryFilter>[] =
  Object.freeze([
    {
      value: "today",
      keywords: Object.freeze(["today", "today's", "todays"]),
      weight: 3,
    },
    {
      value: "this_week",
      keywords: Object.freeze(["this week", "weekly", "week"]),
      weight: 2,
    },
    {
      value: "this_month",
      keywords: Object.freeze(["this month", "monthly", "month"]),
      weight: 2,
    },
    {
      value: "assigned_to_me",
      keywords: Object.freeze([
        "assigned to me",
        "my tasks",
        "my projects",
        "for me",
        "my ",
      ]),
      weight: 2,
    },
    {
      value: "completed",
      keywords: Object.freeze(["completed", "done", "finished", "closed"]),
      weight: 2,
    },
    {
      value: "pending",
      keywords: Object.freeze(["pending", "awaiting", "in progress", "todo"]),
      weight: 2,
    },
    {
      value: "high_priority",
      keywords: Object.freeze([
        "high priority",
        "urgent",
        "critical",
        "priority",
      ]),
      weight: 3,
    },
    {
      value: "department",
      keywords: Object.freeze(["department", "dept", "team"]),
      weight: 2,
    },
    {
      value: "organization",
      keywords: Object.freeze(["organization", "company", "org-wide", "org wide"]),
      weight: 2,
    },
    {
      value: "date_range",
      keywords: Object.freeze([
        "between",
        "from ",
        "date range",
        "last week",
        "last month",
      ]),
      weight: 2,
    },
  ]);

function matchBestRule<T extends string>(
  prompt: string,
  rules: readonly KeywordRule<T>[],
): { value: T; keywords: string[]; score: number } | null {
  let best: { value: T; keywords: string[]; score: number } | null = null;

  for (const rule of rules) {
    const matched: string[] = [];
    let score = 0;
    for (const keyword of rule.keywords) {
      if (prompt.includes(keyword)) {
        matched.push(keyword);
        score += rule.weight;
      }
    }
    if (matched.length === 0) continue;
    if (!best || score > best.score) {
      best = { value: rule.value, keywords: matched, score };
    }
  }

  return best;
}

function matchAllFilters(
  prompt: string,
): {
  filters: AiBusinessQueryFilter[];
  keywords: string[];
} {
  const filters: AiBusinessQueryFilter[] = [];
  const keywords: string[] = [];

  for (const rule of FILTER_RULES) {
    for (const keyword of rule.keywords) {
      if (prompt.includes(keyword)) {
        if (!filters.includes(rule.value)) {
          filters.push(rule.value);
        }
        keywords.push(keyword);
        break;
      }
    }
  }

  return { filters, keywords };
}

/**
 * Parse safe structured signals from a user prompt.
 */
export function parseBusinessQuerySignals(
  prompt: string | null | undefined,
): ParsedBusinessQuerySignals {
  const normalized = (prompt ?? "").toLowerCase().trim();

  if (!normalized) {
    return Object.freeze({
      intent: "summary" as const,
      entity: null,
      filters: Object.freeze([]),
      matchedIntentKeywords: Object.freeze([]),
      matchedEntityKeywords: Object.freeze([]),
      matchedFilterKeywords: Object.freeze([]),
    });
  }

  const intentMatch = matchBestRule(normalized, INTENT_RULES);
  const entityMatch = matchBestRule(normalized, ENTITY_RULES);
  const filterMatch = matchAllFilters(normalized);

  return Object.freeze({
    intent: intentMatch?.value ?? "summary",
    entity: entityMatch?.value ?? null,
    filters: Object.freeze([...filterMatch.filters]),
    matchedIntentKeywords: Object.freeze([
      ...(intentMatch?.keywords ?? []),
    ]),
    matchedEntityKeywords: Object.freeze([
      ...(entityMatch?.keywords ?? []),
    ]),
    matchedFilterKeywords: Object.freeze([...filterMatch.keywords]),
  });
}
