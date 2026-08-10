/**
 * P1 verification — AI mutation tools require confirmation.
 * Run: npx tsx scripts/verify-ai-tool-confirmation.ts
 * (from apps/api)
 */

import assert from "node:assert/strict";

import {
  getProtectedActionByToolId,
  humanConfirmationService,
} from "../src/modules/ai/foundation/confirmation/index.js";
import { getIntegrationImplementationStatus } from "../src/modules/integrations/integrations.constants.js";
import { TOKEN_EXPIRATION } from "@enterprise/shared";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`  FAIL  ${name}: ${detail}`);
  }
}

async function main(): Promise<void> {
  console.log("\nAI tool confirmation + integration status + retention\n");

  process.env.AI_CONFIRMATION_ENABLED = "true";
  process.env.AI_CONFIRMATION_HIGH_RISK_ONLY = "false";

  for (const toolId of ["create_task", "create_calendar_event", "save_ai_document"]) {
    await check(`${toolId} is in protected catalog`, async () => {
      const def = getProtectedActionByToolId(toolId);
      assert.ok(def, `${toolId} missing from PROTECTED_ACTION_CATALOG`);
      assert.equal(humanConfirmationService.requiresConfirmation(toolId), true);
    });
  }

  await check("hire_employee still requires confirmation", async () => {
    assert.equal(humanConfirmationService.requiresConfirmation("hire_employee"), true);
  });

  await check("integration maturity classifications present", async () => {
    assert.equal(getIntegrationImplementationStatus("gemini"), "REAL");
    assert.equal(getIntegrationImplementationStatus("stripe"), "PLACEHOLDER");
    assert.equal(getIntegrationImplementationStatus("gmail"), "PARTIAL");
  });

  await check("audit retention days never-delete (0)", async () => {
    assert.equal(TOKEN_EXPIRATION.AUDIT_LOG_RETENTION_DAYS, 0);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
