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
  MILESTONE: "Milestone based",
  CUSTOM: "Custom payment schedule",
};

export const PAYMENT_SCHEDULE_KIND_LABELS: Record<
  PaymentScheduleKindValue,
  string
> = {
  ADVANCE: "Advance",
  MILESTONE: "Milestone",
  FINAL: "Final",
  CUSTOM: "Custom",
};
