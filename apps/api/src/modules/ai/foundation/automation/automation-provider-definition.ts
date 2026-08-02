/**
 * Automation provider kinds — future-ready registry.
 * EliteFlow AI remains the brain; providers are automation engines only.
 */

export type AiAutomationProviderKind =
  | "n8n"
  | "temporal"
  | "langgraph"
  | "azure-logic-apps"
  | "power-automate"
  | "zapier"
  | "custom";

export interface AiAutomationProviderDefinition {
  readonly id: string;
  readonly kind: AiAutomationProviderKind;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly supportsAsync: boolean;
  readonly supportsBackground: boolean;
  readonly supportsCallback: boolean;
  readonly supportsCancel: boolean;
  readonly supportsRetry: boolean;
  readonly enabled: boolean;
}

export function formatAutomationProviderKind(
  kind: AiAutomationProviderKind,
): string {
  switch (kind) {
    case "n8n":
      return "n8n";
    case "temporal":
      return "Temporal";
    case "langgraph":
      return "LangGraph";
    case "azure-logic-apps":
      return "Azure Logic Apps";
    case "power-automate":
      return "Power Automate";
    case "zapier":
      return "Zapier";
    case "custom":
      return "Custom";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
