/**
 * Verification harness for Email AI Voice recipient extraction.
 * Run: npx tsx apps/web/scripts/verify-email-ai-recipient.ts
 */
import assert from "node:assert/strict";

import {
  composeAiEmailIntent,
  parseVoiceEmailCommand,
  resolveRecipientsForAssistant,
  type RecipientCandidate,
} from "../src/features/communication/utils/email-ai-agent";

const catalog: RecipientCandidate[] = [
  {
    id: "hr",
    kind: "department",
    label: "HR",
    sharedKey: "hr",
    userIds: ["u1"],
    email: "hr@eliteflow.dev",
  },
  {
    id: "finance",
    kind: "department",
    label: "Finance",
    sharedKey: "finance",
    userIds: ["u3"],
    email: "finance@eliteflow.dev",
  },
  {
    id: "emp1",
    kind: "employee",
    label: "Ali Ahmad",
    userIds: ["u2"],
    email: "ali@eliteflow.dev",
  },
];

function main() {
  const urduHr = "Mujhe HR ko thanks ka email likh kar do.";
  assert.equal(parseVoiceEmailCommand(urduHr).recipientQuery, "hr team");
  const urduResult = composeAiEmailIntent({
    prompt: urduHr,
    catalog,
    authorName: "Test",
  });
  assert.deepEqual(
    urduResult.recipients.map((r) => r.label),
    ["HR"],
  );
  assert.ok(urduResult.subject.length > 0);
  assert.ok(urduResult.body.length > 0);
  assert.doesNotMatch(urduResult.assistantMessage, /couldn't find/i);

  const garbled = "mujhe thanks yogi mel likh kar diya char";
  assert.equal(parseVoiceEmailCommand(garbled).recipientQuery ?? null, null);
  const garbledResolved = resolveRecipientsForAssistant("", catalog, garbled);
  assert.ok(!garbledResolved.unresolved.includes(garbled));
  const garbledResult = composeAiEmailIntent({
    prompt: garbled,
    catalog,
    authorName: "Test",
  });
  assert.equal(garbledResult.recipients.length, 0);
  assert.match(garbledResult.assistantMessage, /couldn't determine who/i);
  assert.ok(!garbledResult.assistantMessage.includes(garbled));

  const english = composeAiEmailIntent({
    prompt: "Send a thank you email to HR",
    catalog,
    authorName: "Test",
  });
  assert.deepEqual(
    english.recipients.map((r) => r.label),
    ["HR"],
  );

  const person = composeAiEmailIntent({
    prompt: "Ali Ahmad ko thank you email bhej do",
    catalog,
    authorName: "Test",
  });
  assert.deepEqual(
    person.recipients.map((r) => r.label),
    ["Ali Ahmad"],
  );

  const manual = resolveRecipientsForAssistant("finance", catalog);
  assert.deepEqual(
    manual.matched.map((m) => m.label),
    ["Finance"],
  );

  console.log("verify-email-ai-recipient: ALL_PASSED");
}

main();
