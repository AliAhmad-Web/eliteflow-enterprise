/**
 * Enterprise data classification tiers (Phase 3 Step 11).
 * Aligns with existing field RESTRICTED/CONFIDENTIAL redaction concepts.
 */
export const DATA_CLASSIFICATIONS = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
] as const;

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

/** Minimum trust risk ceiling allowed without step-up for each classification. */
export const CLASSIFICATION_TRUST_REQUIREMENTS: Record<
  DataClassification,
  {
    /** Max risk still allowed without step-up */
    maxRiskWithoutStepUp: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    /** Whether RESTRICTED-level sensitivity applies */
    elevated: boolean;
  }
> = {
  PUBLIC: { maxRiskWithoutStepUp: "HIGH", elevated: false },
  INTERNAL: { maxRiskWithoutStepUp: "MEDIUM", elevated: false },
  CONFIDENTIAL: { maxRiskWithoutStepUp: "MEDIUM", elevated: true },
  RESTRICTED: { maxRiskWithoutStepUp: "LOW", elevated: true },
};
