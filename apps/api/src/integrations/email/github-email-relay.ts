/**
 * Dispatch transactional email to GitHub Actions (HTTPS).
 * Used when the API host blocks outbound SMTP (e.g. Railway → Gmail).
 *
 * Waits for the workflow run to complete so callers do not report success
 * when Gmail SMTP later fails inside Actions.
 */
import { emailConfig } from "../../config/email.config.js";

const WORKFLOW_FILE = "send-transactional-email.yml";
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 90_000;

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
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?event=repository_dispatch&per_page=10`,
    { headers: githubHeaders(token) },
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
  dispatchedAtMs: number;
}): Promise<{ id: string }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  // Allow small clock skew between API host and GitHub.
  const minCreatedAtMs = input.dispatchedAtMs - 15_000;
  let lastStatus = "pending";

  while (Date.now() < deadline) {
    const runs = await listRecentWorkflowRuns(input.repo, input.token);
    const candidate = runs.find((run) => {
      const createdAtMs = Date.parse(run.created_at);
      return (
        run.event === "repository_dispatch" &&
        Number.isFinite(createdAtMs) &&
        createdAtMs >= minCreatedAtMs
      );
    });

    if (candidate) {
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

  const dispatchedAtMs = Date.now();
  const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({
      event_type: "transactional_email",
      client_payload: {
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub email relay failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  return waitForWorkflowSuccess({ repo, token, dispatchedAtMs });
}
