/**
 * n8n workflow metadata — planning/integration models only.
 * Never embeds business logic.
 */

export interface AiN8nWorkflowRef {
  readonly workflowId: string;
  readonly workflowName: string;
  readonly version: string;
  readonly active: boolean;
}

export function buildN8nWorkflowRef(input: {
  readonly workflowKey: string;
  readonly category?: string | null;
}): AiN8nWorkflowRef {
  const key = (input.workflowKey || "eliteflow.default").trim();
  return Object.freeze({
    workflowId: `n8n.wf.${key}`,
    workflowName: `EliteFlow ${input.category ?? "Generic"} Automation`,
    version: "1.0",
    active: true,
  });
}
