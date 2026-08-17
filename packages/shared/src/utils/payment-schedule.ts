import type {
  PaymentModelValue,
  PaymentScheduleInput,
  PaymentScheduleKindValue,
} from "../schemas/quotes.schema.js";

export interface CalculatedScheduleItem {
  kind: PaymentScheduleKindValue;
  label: string;
  percent: number;
  amount: number;
  dueDate: string | null;
  sortOrder: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const MODEL_TEMPLATES: Record<
  Exclude<PaymentModelValue, "MILESTONE" | "CUSTOM">,
  Array<{ kind: PaymentScheduleKindValue; label: string; percent: number }>
> = {
  UPFRONT_100: [
    { kind: "FINAL", label: "Full payment (100% upfront)", percent: 100 },
  ],
  SPLIT_50_50: [
    { kind: "ADVANCE", label: "Advance payment (50%)", percent: 50 },
    { kind: "FINAL", label: "Final payment (50%)", percent: 50 },
  ],
  SPLIT_30_70: [
    { kind: "ADVANCE", label: "Advance payment (30%)", percent: 30 },
    { kind: "FINAL", label: "Final payment (70%)", percent: 70 },
  ],
  SPLIT_35_65: [
    { kind: "ADVANCE", label: "Advance payment (35%)", percent: 35 },
    { kind: "FINAL", label: "Final payment (65%)", percent: 65 },
  ],
  SPLIT_40_60: [
    { kind: "ADVANCE", label: "Advance payment (40%)", percent: 40 },
    { kind: "FINAL", label: "Final payment (60%)", percent: 60 },
  ],
};

function allocateAmounts(
  dealAmount: number,
  rows: Array<{
    kind: PaymentScheduleKindValue;
    label: string;
    percent?: number;
    amount?: number;
    dueDate?: string | null;
  }>,
): CalculatedScheduleItem[] {
  if (dealAmount <= 0) {
    throw new Error("Deal amount must be greater than 0");
  }
  if (rows.length === 0) {
    throw new Error("Payment schedule cannot be empty");
  }

  const prepared = rows.map((row, index) => {
    const explicitAmount =
      row.amount != null && Number.isFinite(row.amount) ? row.amount : null;
    const explicitPercent =
      row.percent != null && Number.isFinite(row.percent) ? row.percent : null;

    let amount = 0;
    let percent = 0;
    if (explicitAmount != null && explicitAmount > 0) {
      amount = roundMoney(explicitAmount);
      percent = roundPercent((amount / dealAmount) * 100);
    } else if (explicitPercent != null) {
      percent = roundPercent(explicitPercent);
      amount = roundMoney((dealAmount * percent) / 100);
    } else {
      throw new Error(`Schedule item ${index + 1} needs a percent or amount`);
    }

    return {
      kind: row.kind,
      label: row.label.trim() || `Payment ${index + 1}`,
      percent,
      amount,
      dueDate: row.dueDate?.trim() ? row.dueDate.trim() : null,
      sortOrder: index,
    };
  });

  const allocatedExceptLast = prepared
    .slice(0, -1)
    .reduce((sum, item) => sum + item.amount, 0);
  const last = prepared[prepared.length - 1]!;
  last.amount = roundMoney(dealAmount - allocatedExceptLast);
  last.percent = roundPercent((last.amount / dealAmount) * 100);

  if (last.amount < 0) {
    throw new Error("Payment schedule exceeds the agreed deal amount");
  }

  const sum = roundMoney(prepared.reduce((total, item) => total + item.amount, 0));
  if (Math.abs(sum - dealAmount) > 0.01) {
    throw new Error("Payment schedule must equal the agreed deal amount");
  }

  return prepared;
}

export function calculatePaymentSchedule(input: {
  dealAmount: number;
  paymentModel: PaymentModelValue;
  customItems?: PaymentScheduleInput[];
}): CalculatedScheduleItem[] {
  const dealAmount = roundMoney(input.dealAmount);

  if (
    input.paymentModel === "MILESTONE" ||
    input.paymentModel === "CUSTOM"
  ) {
    if (!input.customItems || input.customItems.length === 0) {
      throw new Error(
        "Milestone and custom payment models require a payment schedule",
      );
    }
    return allocateAmounts(dealAmount, input.customItems);
  }

  return allocateAmounts(dealAmount, MODEL_TEMPLATES[input.paymentModel]);
}

export const PAYMENT_MODEL_LABELS: Record<PaymentModelValue, string> = {
  UPFRONT_100: "100% Upfront",
  SPLIT_50_50: "50% Advance + 50% Final",
  SPLIT_30_70: "30% Advance + 70% Final",
  SPLIT_35_65: "35% Advance + 65% Final",
  SPLIT_40_60: "40% Advance + 60% Final",
  MILESTONE: "Milestone based",
  CUSTOM: "Custom payment schedule",
};

export const CUSTOMER_SELECTABLE_PAYMENT_MODELS: PaymentModelValue[] = [
  "UPFRONT_100",
  "SPLIT_50_50",
  "SPLIT_30_70",
  "SPLIT_35_65",
  "SPLIT_40_60",
];

export function normalizeAllowedPaymentModels(
  paymentModel: PaymentModelValue,
  allowed?: PaymentModelValue[] | null,
): PaymentModelValue[] {
  const selected = allowed?.filter(Boolean) ?? [];
  const unique = [...new Set([paymentModel, ...selected])];
  if (paymentModel === "CUSTOM" || paymentModel === "MILESTONE") {
    return [paymentModel];
  }
  return unique.filter(
    (model) =>
      model === paymentModel ||
      CUSTOMER_SELECTABLE_PAYMENT_MODELS.includes(model),
  );
}

export function quoteCommercialSummary(input: {
  total: number;
  paymentSchedule: Array<{
    kind: string;
    amount: number;
    paymentStatus?: string | null;
    paidAmount?: number | null;
  }>;
}): {
  dealAmount: number;
  advanceRequired: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "PENDING";
} {
  const dealAmount = roundMoney(input.total);
  const advance = input.paymentSchedule.find((item) => item.kind === "ADVANCE");
  const advanceRequired = roundMoney(
    advance?.amount ??
      (input.paymentSchedule.length === 1
        ? input.paymentSchedule[0]!.amount
        : 0),
  );
  const paidAmount = roundMoney(
    input.paymentSchedule.reduce((sum, item) => {
      if (item.paidAmount != null && Number.isFinite(item.paidAmount)) {
        return sum + item.paidAmount;
      }
      if (item.paymentStatus === "PAID") return sum + item.amount;
      if (item.paymentStatus === "PARTIALLY_PAID") {
        return sum + (item.paidAmount ?? 0);
      }
      return sum;
    }, 0),
  );
  const remainingAmount = roundMoney(Math.max(0, dealAmount - paidAmount));
  let paymentStatus: "PAID" | "PARTIALLY_PAID" | "PENDING" = "PENDING";
  if (dealAmount > 0 && paidAmount + 0.009 >= dealAmount) {
    paymentStatus = "PAID";
  } else if (paidAmount > 0) {
    paymentStatus = "PARTIALLY_PAID";
  }
  return {
    dealAmount,
    advanceRequired,
    paidAmount,
    remainingAmount,
    paymentStatus,
  };
}

export const COMMERCIAL_STAGES = [
  "DEAL_APPROVED",
  "ADVANCE_REQUIRED",
  "PAYMENT_PROOF_SUBMITTED",
  "PENDING_VERIFICATION",
  "PAYMENT_VERIFIED",
  "PROJECT_STARTED",
  "FINAL_PAYMENT_DUE",
  "FINAL_PAYMENT_COMPLETE",
] as const;

export type CommercialStageValue = (typeof COMMERCIAL_STAGES)[number];

export function quoteCommercialStage(input: {
  status: string;
  paymentSchedule: Array<{
    kind: string;
    paymentStatus?: string | null;
  }>;
  projectStatus?: string | null;
}): {
  commercialStage: CommercialStageValue | null;
  workspaceUnlocked: boolean;
} {
  const first =
    input.paymentSchedule.find((item) => item.kind === "ADVANCE") ??
    input.paymentSchedule[0];
  const firstPaid = first?.paymentStatus === "PAID";
  const firstPending =
    first?.paymentStatus === "PENDING" ||
    first?.paymentStatus === "PARTIALLY_PAID";
  // For multi-item schedules, ADVANCE is "first". For UPFRONT_100 the sole FINAL is first.
  const hasLaterInstallments = input.paymentSchedule.some(
    (item) => item !== first,
  );
  const laterUnpaid = input.paymentSchedule.some(
    (item) => item !== first && item.paymentStatus !== "PAID",
  );

  if (input.status === "SENT" || input.status === "APPROVED") {
    if (firstPaid) {
      const projectCompleted = input.projectStatus === "COMPLETED";
      if (projectCompleted) {
        if (hasLaterInstallments && laterUnpaid) {
          return {
            commercialStage: "FINAL_PAYMENT_DUE",
            workspaceUnlocked: true,
          };
        }
        return {
          commercialStage: "FINAL_PAYMENT_COMPLETE",
          workspaceUnlocked: true,
        };
      }
      const started =
        input.projectStatus === "IN_PROGRESS" ||
        input.projectStatus === "COMPLETED";
      return {
        commercialStage: started ? "PROJECT_STARTED" : "PAYMENT_VERIFIED",
        workspaceUnlocked: firstPaid,
      };
    }
    if (firstPending) {
      return {
        commercialStage:
          first?.paymentStatus === "PARTIALLY_PAID"
            ? "PENDING_VERIFICATION"
            : "PAYMENT_PROOF_SUBMITTED",
        workspaceUnlocked: false,
      };
    }
    return { commercialStage: "ADVANCE_REQUIRED", workspaceUnlocked: false };
  }
  return { commercialStage: null, workspaceUnlocked: false };
}

export const PAYMENT_SCHEDULE_KIND_LABELS: Record<
  PaymentScheduleKindValue,
  string
> = {
  ADVANCE: "Advance",
  MILESTONE: "Milestone",
  FINAL: "Final",
  CUSTOM: "Custom",
};
