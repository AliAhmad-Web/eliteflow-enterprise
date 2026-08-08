/**
 * Dispatch transactional email to GitHub Actions (HTTPS).
 * Used when the API host blocks outbound SMTP (e.g. Railway → Gmail).
 *
 * Waits for the *new* workflow run (not a prior run) to complete so callers
 * do not report success when Gmail SMTP later fails inside Actions.
 */
import { randomBytes } from "node:crypto";

import { emailConfig } from "../../config/email.config.js";

const WORKFLOW_FILE = "send-transactional-email.yml";
const POLL_INTERVAL_MS = 2_000;
/** Must stay under the web client's default 45s request timeout. */
const POLL_TIMEOUT_MS = 35_000;
const GITHUB_FETCH_TIMEOUT_MS = 12_000;

export function isGithubEmailRelayConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_EMAIL_RELAY_TOKEN?.trim() &&
      process.env.GITHUB_EMAIL_RELAY_REPO?.trim(),
  );
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": `${emailConfig.appName}-api`,
  };
}

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  html_url: string;
}

async function listRecentWorkflowRuns(
  repo: string,
  token: string,
): Promise<WorkflowRun[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?event=repository_dispatch&per_page=15`,
    {
      headers: githubHeaders(token),
      signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub workflow list failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as { workflow_runs?: WorkflowRun[] };
  return payload.workflow_runs ?? [];
}

async function waitForWorkflowSuccess(input: {
  repo: string;
  token: string;
  knownRunIds: Set<number>;
}): Promise<{ id: string }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus = "pending";
  let trackedRunId: number | null = null;

  while (Date.now() < deadline) {
    const runs = await listRecentWorkflowRuns(input.repo, input.token);

    let candidate: WorkflowRun | undefined;
    if (trackedRunId !== null) {
      candidate = runs.find((run) => run.id === trackedRunId);
    } else {
      candidate = runs.find(
        (run) =>
          run.event === "repository_dispatch" &&
          !input.knownRunIds.has(run.id),
      );
    }

    if (candidate) {
      trackedRunId = candidate.id;
      lastStatus = `${candidate.status}:${candidate.conclusion ?? "none"}`;
      if (candidate.status === "completed") {
        if (candidate.conclusion === "success") {
          return { id: `github-run:${candidate.id}` };
        }
        throw new Error(
          `GitHub email workflow failed (conclusion=${candidate.conclusion}). See ${candidate.html_url}`,
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `GitHub email workflow did not complete within ${POLL_TIMEOUT_MS / 1000}s (last=${lastStatus})`,
  );
}

export async function sendViaGithubEmailRelay(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string }> {
  const token = process.env.GITHUB_EMAIL_RELAY_TOKEN?.trim();
  const repo = process.env.GITHUB_EMAIL_RELAY_REPO?.trim();
  if (!token || !repo) {
    throw new Error("GitHub email relay is not configured");
  }

  // Snapshot existing runs so we wait for *this* dispatch, not a prior success.
  const existing = await listRecentWorkflowRuns(repo, token);
  const knownRunIds = new Set(existing.map((run) => run.id));
  const nonce = randomBytes(8).toString("hex");

  const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({
      event_type: "transactional_email",
      client_payload: {
        to: input.to,
        subject: input.subject,
        // Keep payloads compact — GitHub client_payload has a size ceiling.
        html: input.html.slice(0, 40_000),
        text: input.text.slice(0, 20_000),
        nonce,
      },
    }),
    signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub email relay failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  return waitForWorkflowSuccess({ repo, token, knownRunIds });
}
