/**
 * Contract checks for right-panel quick-access config (no network).
 * Run: npx tsx apps/web/scripts/verify-right-panel-contract.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(
  path.join(root, "src/features/dashboard/config/quick-access.actions.ts"),
  "utf8",
);

assert.match(source, /export const QUICK_ACCESS_ACTIONS/);
assert.match(source, /export const AI_QUICK_ACTIONS/);
assert.match(source, /PERMISSIONS\.TASKS_READ/);
assert.match(source, /PERMISSIONS\.CALENDAR_READ/);
assert.match(source, /PERMISSIONS\.AI_USE/);
assert.match(source, /ROUTES\.TASKS/);
assert.match(source, /ROUTES\.CALENDAR/);
assert.match(source, /ROUTES\.AI_ASSISTANT/);
assert.doesNotMatch(source, /DUMMY_/);
assert.doesNotMatch(source, /Acme Corporation/);

const tasksWidget = readFileSync(
  path.join(root, "src/features/dashboard/components/todays-tasks-widget.tsx"),
  "utf8",
);
assert.match(tasksWidget, /useTodaysTasks/);
assert.match(tasksWidget, /useUpdateTask/);
assert.doesNotMatch(tasksWidget, /DUMMY_TASKS/);

const calendarWidget = readFileSync(
  path.join(root, "src/features/dashboard/components/calendar-widget.tsx"),
  "utf8",
);
assert.match(calendarWidget, /useSidebarCalendar/);
assert.doesNotMatch(calendarWidget, /DUMMY_CALENDAR/);

const aiWidget = readFileSync(
  path.join(root, "src/features/dashboard/components/ai-assistant-widget.tsx"),
  "utf8",
);
assert.match(aiWidget, /useAiChat/);
assert.doesNotMatch(aiWidget, /Prompt chat ships with the AI module/);
assert.match(aiWidget, /onSubmit=\{onSubmit\}/);

const panel = readFileSync(
  path.join(
    root,
    "src/features/dashboard/components/dashboard-right-panel-content.tsx",
  ),
  "utf8",
);
assert.match(panel, /QuickAccessWidget/);
assert.match(panel, /TodaysTasksWidget/);
assert.match(panel, /CalendarWidget/);
assert.match(panel, /AiAssistantWidget/);
assert.doesNotMatch(panel, /dashboard\.dummy/);

console.log("verify-right-panel-contract: OK");
