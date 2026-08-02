/**
 * Business Reasoning Engine — reason over existing moduleData only.
 * Never queries databases. Never calls services. Never executes tools.
 */

import type { AiModuleDataBundle } from "../modules/data/module-data-response.js";
import type { AiModuleDataResponse } from "../modules/data/module-data-response.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";
import type { AiBusinessReasoning } from "./business-reasoning.js";
import type { AiBusinessAnalysisItem } from "./business-analysis.js";
import { sanitizeAnalysisText } from "./business-analysis.js";
import type { AiBusinessInsight } from "./business-insights.js";
import type { AiBusinessRisk } from "./business-risks.js";
import type { AiBusinessRecommendation } from "./business-recommendations.js";
import type { AiBusinessPriority } from "./business-priorities.js";
import { buildBusinessSummary } from "./business-summary.js";
import { scoreBusinessReasoningConfidence } from "./business-confidence.js";

export interface ResolveBusinessReasoningInput {
  readonly moduleData?: AiModuleDataBundle | null;
  readonly businessQuery?: AiBusinessQuery | null;
}

function numericValue(value: string | number): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function labelKey(label: string): string {
  return label.toLowerCase().trim();
}

function analyzeResponse(
  response: AiModuleDataResponse,
): {
  analysis: AiBusinessAnalysisItem[];
  insights: AiBusinessInsight[];
  risks: AiBusinessRisk[];
  priorities: AiBusinessPriority[];
  recommendations: AiBusinessRecommendation[];
  highlights: string[];
  notes: string[];
} {
  const analysis: AiBusinessAnalysisItem[] = [];
  const insights: AiBusinessInsight[] = [];
  const risks: AiBusinessRisk[] = [];
  const priorities: AiBusinessPriority[] = [];
  const recommendations: AiBusinessRecommendation[] = [];
  const highlights: string[] = [];
  const notes: string[] = [];

  if (response.status !== "ok" && response.status !== "empty") {
    notes.push(
      sanitizeAnalysisText(
        `${response.moduleName}:unavailable:${response.status}`,
        80,
      ),
    );
    return { analysis, insights, risks, priorities, recommendations, highlights, notes };
  }

  if (response.summaries.length === 0) {
    analysis.push({
      moduleName: response.moduleName,
      observation: "No summary counts available",
      severity: "info",
    });
    return { analysis, insights, risks, priorities, recommendations, highlights, notes };
  }

  const module = response.moduleName.toLowerCase();
  const byLabel = new Map(
    response.summaries.map((item) => [labelKey(String(item.label)), item]),
  );

  const getNum = (...labels: string[]): number | null => {
    for (const label of labels) {
      const item = byLabel.get(labelKey(label));
      if (!item) continue;
      const num = numericValue(item.value);
      if (num !== null) return num;
    }
    return null;
  };

  // Tasks
  if (module.includes("task")) {
    const overdue = getNum("Overdue Tasks");
    const todays = getNum("Today's Tasks", "Todays Tasks");
    if (todays !== null) {
      analysis.push({
        moduleName: response.moduleName,
        observation: sanitizeAnalysisText(`${todays} open tasks`),
        severity: todays > 15 ? "attention" : "info",
      });
      insights.push({
        kind: "workload",
        text: sanitizeAnalysisText(
          todays > 15
            ? `High open task volume (${todays})`
            : `Open task volume is manageable (${todays})`,
        ),
      });
      highlights.push(`${todays} open tasks`);
    }
    if (overdue !== null && overdue > 0) {
      analysis.push({
        moduleName: response.moduleName,
        observation: sanitizeAnalysisText(`${overdue} overdue tasks`),
        severity: overdue >= 5 ? "attention" : "watch",
      });
      risks.push({
        level: overdue >= 5 ? "high" : "medium",
        text: sanitizeAnalysisText(`${overdue} overdue tasks need attention`),
      });
      priorities.push({
        urgency: overdue >= 5 ? "high" : "medium",
        text: "Clear overdue tasks first",
      });
      recommendations.push({
        priority: overdue >= 5 ? "high" : "medium",
        text: "Recommend prioritization of overdue tasks",
      });
      highlights.push(`${overdue} overdue`);
    }
  }

  // Projects
  if (module.includes("project")) {
    const open = getNum("Open Projects", "Active Projects");
    const completed = getNum("Completed Projects");
    if (open !== null) {
      analysis.push({
        moduleName: response.moduleName,
        observation: sanitizeAnalysisText(`${open} open projects`),
        severity: open > 10 ? "watch" : "info",
      });
      insights.push({
        kind: "progress",
        text: sanitizeAnalysisText(
          open > 10
            ? `Elevated open project load (${open})`
            : `Open project load is stable (${open})`,
        ),
      });
      if (open > 10) {
        risks.push({
          level: "medium",
          text: "Project load may delay delivery",
        });
        priorities.push({
          urgency: "medium",
          text: "Review project capacity",
        });
        recommendations.push({
          priority: "medium",
          text: "Recommend reviewing open project priorities",
        });
      }
      highlights.push(`${open} open projects`);
    }
    if (completed !== null && open !== null && open > 0 && completed === 0) {
      risks.push({
        level: "high",
        text: "Progress low with open projects and no completions",
      });
      recommendations.push({
        priority: "high",
        text: "Recommend focusing near-deadline projects",
      });
    }
  }

  // Finance
  if (module.includes("finance")) {
    const openInvoices = getNum("Finance Summary", "Open Invoices");
    const paid = getNum("Paid Invoices");
    if (openInvoices !== null) {
      analysis.push({
        moduleName: response.moduleName,
        observation: sanitizeAnalysisText(`${openInvoices} open invoices`),
        severity: openInvoices > 20 ? "watch" : "info",
      });
      insights.push({
        kind: "finance",
        text: sanitizeAnalysisText(
          openInvoices > 20
            ? `Elevated open invoice count (${openInvoices})`
            : `Open invoice volume is within a normal range (${openInvoices})`,
        ),
      });
      highlights.push(`${openInvoices} open invoices`);
    }
    if (paid !== null && openInvoices !== null && paid === 0 && openInvoices > 0) {
      insights.push({
        kind: "finance",
        text: "Paid invoice activity appears low relative to open volume",
      });
    }
  }

  // Documents
  if (module.includes("document")) {
    const unread = getNum("Unread Documents");
    if (unread !== null && unread > 0) {
      analysis.push({
        moduleName: response.moduleName,
        observation: sanitizeAnalysisText(`${unread} unread documents`),
        severity: unread >= 10 ? "attention" : "watch",
      });
      insights.push({
        kind: "attention",
        text: sanitizeAnalysisText(
          unread >= 10
            ? `Many unread documents (${unread})`
            : `${unread} unread documents pending review`,
        ),
      });
      recommendations.push({
        priority: unread >= 10 ? "high" : "medium",
        text: "Recommend document review",
      });
      priorities.push({
        urgency: unread >= 10 ? "high" : "medium",
        text: "Review unread documents",
      });
      highlights.push(`${unread} unread documents`);
    }
  }

  // Calendar / Meetings
  if (module.includes("calendar")) {
    const upcoming = getNum("Upcoming Meetings", "Upcoming Events");
    const today = getNum("Today's Events", "Todays Events");
    if (upcoming !== null) {
      analysis.push({
        moduleName: response.moduleName,
        observation: sanitizeAnalysisText(`${upcoming} upcoming meetings`),
        severity: "info",
      });
      insights.push({
        kind: "general",
        text: sanitizeAnalysisText(`${upcoming} upcoming meetings scheduled`),
      });
      highlights.push(`${upcoming} upcoming meetings`);
    }
    if (today !== null && today > 5) {
      priorities.push({
        urgency: "medium",
        text: "Prepare for a busy meeting day",
      });
    }
  }

  // Notifications
  if (module.includes("notification")) {
    const unread = getNum("Unread Notifications");
    if (unread !== null && unread > 0) {
      insights.push({
        kind: "attention",
        text: sanitizeAnalysisText(`${unread} unread notifications`),
      });
      if (unread >= 20) {
        recommendations.push({
          priority: "medium",
          text: "Recommend clearing notification backlog",
        });
      }
      highlights.push(`${unread} unread notifications`);
    }
  }

  // CRM
  if (module.includes("crm")) {
    const active = getNum("Active Clients");
    if (active !== null) {
      insights.push({
        kind: "general",
        text: sanitizeAnalysisText(`${active} active clients in CRM`),
      });
      highlights.push(`${active} active clients`);
    }
  }

  // HRM
  if (module.includes("hrm") || module.includes("hr")) {
    const members = getNum("Team Members");
    if (members !== null) {
      insights.push({
        kind: "general",
        text: sanitizeAnalysisText(`Team size summary: ${members} members`),
      });
    }
  }

  // Reports / Storage — light insights only
  if (module.includes("report")) {
    const saved = getNum("Saved Reports");
    if (saved !== null) {
      insights.push({
        kind: "general",
        text: sanitizeAnalysisText(`${saved} saved reports available`),
      });
    }
  }
  if (module.includes("storage")) {
    const files = getNum("Stored Files");
    if (files !== null) {
      insights.push({
        kind: "general",
        text: sanitizeAnalysisText(`${files} stored files referenced`),
      });
    }
  }

  notes.push(
    sanitizeAnalysisText(
      `analyzed:${response.moduleName}:${response.summaries.length}`,
      80,
    ),
  );

  return { analysis, insights, risks, priorities, recommendations, highlights, notes };
}

/**
 * Resolve immutable business reasoning from existing runtime module data.
 */
export function resolveBusinessReasoning(
  input: ResolveBusinessReasoningInput,
): AiBusinessReasoning {
  const responses = input.moduleData?.responses ?? [];
  const analysis: AiBusinessAnalysisItem[] = [];
  const insights: AiBusinessInsight[] = [];
  const risks: AiBusinessRisk[] = [];
  const priorities: AiBusinessPriority[] = [];
  const recommendations: AiBusinessRecommendation[] = [];
  const highlights: string[] = [];
  const notes: string[] = [];

  let okModuleCount = 0;
  let summaryItemCount = 0;

  for (const response of responses.slice(0, 8)) {
    if (response.status === "ok" || response.status === "empty") {
      okModuleCount += 1;
      summaryItemCount += response.summaries.length;
    }
    const result = analyzeResponse(response);
    analysis.push(...result.analysis);
    insights.push(...result.insights);
    risks.push(...result.risks);
    priorities.push(...result.priorities);
    recommendations.push(...result.recommendations);
    highlights.push(...result.highlights);
    notes.push(...result.notes);
  }

  if (input.businessQuery?.intent) {
    notes.push(
      sanitizeAnalysisText(`query-intent:${input.businessQuery.intent}`, 60),
    );
  }
  if (input.businessQuery?.moduleName) {
    notes.push(
      sanitizeAnalysisText(
        `query-module:${input.businessQuery.moduleName}`,
        60,
      ),
    );
  }

  const limitedInsights = Object.freeze(insights.slice(0, 8));
  const limitedRisks = Object.freeze(risks.slice(0, 6));
  const limitedPriorities = Object.freeze(priorities.slice(0, 6));
  const limitedRecommendations = Object.freeze(recommendations.slice(0, 6));

  const summary = buildBusinessSummary({
    moduleCount: okModuleCount,
    insightCount: limitedInsights.length,
    riskCount: limitedRisks.length,
    recommendationCount: limitedRecommendations.length,
    highlights,
  });

  const confidence = scoreBusinessReasoningConfidence({
    okModuleCount,
    summaryItemCount,
    insightCount: limitedInsights.length,
    riskCount: limitedRisks.length,
    hasBusinessQuery: Boolean(input.businessQuery),
  });

  return Object.freeze({
    summary: sanitizeAnalysisText(summary, 240),
    analysis: Object.freeze(analysis.slice(0, 12)),
    insights: limitedInsights,
    risks: limitedRisks,
    priorities: limitedPriorities,
    recommendations: limitedRecommendations,
    confidence,
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitizeAnalysisText(n, 80)))].slice(0, 12),
    ),
  });
}

export const businessReasoningEngine = Object.freeze({
  resolve: resolveBusinessReasoning,
});
