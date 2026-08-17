/**
 * Smoke checks for final-payment commercial stage helpers.
 * Run: npx tsx apps/api/scripts/verify-final-payment-commercial-stage.ts
 */
import {
  calculatePaymentSchedule,
  quoteCommercialStage,
} from "@enterprise/shared";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const schedule = calculatePaymentSchedule({
  dealAmount: 100_000,
  paymentModel: "SPLIT_30_70",
});

assert(schedule.length === 2, "SPLIT_30_70 should yield 2 schedule items");
assert(schedule[0]?.kind === "ADVANCE", "first item should be ADVANCE");
assert(schedule[1]?.kind === "FINAL", "second item should be FINAL");
assert(
  Math.abs(schedule[0]!.amount - 30_000) < 0.01,
  "advance should be 30000",
);
assert(Math.abs(schedule[1]!.amount - 70_000) < 0.01, "final should be 70000");

const advanceDue = quoteCommercialStage({
  status: "APPROVED",
  paymentSchedule: schedule.map((item) => ({
    kind: item.kind,
    paymentStatus: null,
  })),
  projectStatus: "NOT_STARTED",
});
assert(
  advanceDue.commercialStage === "ADVANCE_REQUIRED",
  "expected ADVANCE_REQUIRED",
);

const projectStarted = quoteCommercialStage({
  status: "APPROVED",
  paymentSchedule: [
    { kind: "ADVANCE", paymentStatus: "PAID" },
    { kind: "FINAL", paymentStatus: null },
  ],
  projectStatus: "IN_PROGRESS",
});
assert(
  projectStarted.commercialStage === "PROJECT_STARTED",
  "expected PROJECT_STARTED",
);

const finalDue = quoteCommercialStage({
  status: "APPROVED",
  paymentSchedule: [
    { kind: "ADVANCE", paymentStatus: "PAID" },
    { kind: "FINAL", paymentStatus: "UNPAID" },
  ],
  projectStatus: "COMPLETED",
});
assert(
  finalDue.commercialStage === "FINAL_PAYMENT_DUE",
  "expected FINAL_PAYMENT_DUE",
);

const finalComplete = quoteCommercialStage({
  status: "APPROVED",
  paymentSchedule: [
    { kind: "ADVANCE", paymentStatus: "PAID" },
    { kind: "FINAL", paymentStatus: "PAID" },
  ],
  projectStatus: "COMPLETED",
});
assert(
  finalComplete.commercialStage === "FINAL_PAYMENT_COMPLETE",
  "expected FINAL_PAYMENT_COMPLETE",
);

const idempotentFinalDue = quoteCommercialStage({
  status: "APPROVED",
  paymentSchedule: [
    { kind: "ADVANCE", paymentStatus: "PAID" },
    { kind: "FINAL", paymentStatus: "PENDING" },
  ],
  projectStatus: "COMPLETED",
});
assert(
  idempotentFinalDue.commercialStage === "FINAL_PAYMENT_DUE",
  "pending final still FINAL_PAYMENT_DUE",
);

console.log("verify-final-payment-commercial-stage: OK");
