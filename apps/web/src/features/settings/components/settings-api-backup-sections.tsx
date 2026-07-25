"use client";

import { INTEGRATION_PROVIDERS } from "@enterprise/shared";
import { HardDrive, KeyRound } from "lucide-react";
import { memo, useState, type FormEvent } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/services/api/api-error";

import {
  useSettingsApiKeys,
  useSettingsBackups,
  useSettingsMutation,
} from "../hooks/use-settings";
import { settingsService } from "../services/settings.service";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function Feedback({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) return null;
  return (
    <p
      className={
        error
          ? "text-sm text-destructive"
          : "text-sm text-emerald-700 dark:text-emerald-300"
      }
      role="status"
    >
      {error ?? success}
    </p>
  );
}

function useSaveState() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  return {
    error,
    success,
    setSuccess,
    clear() {
      setError(null);
      setSuccess(null);
    },
    fromError(err: unknown) {
      setSuccess(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Unable to save settings",
      );
    },
  };
}

export const ApiKeysSection = memo(function ApiKeysSection({
  enabled,
}: {
  enabled: boolean;
}) {
  const feedback = useSaveState();
  const query = useSettingsApiKeys(enabled);
  const createMutation = useSettingsMutation(
    settingsService.createApiKey,
    "api-keys",
  );
  const deleteMutation = useSettingsMutation(
    (id: string) => settingsService.deleteApiKey(id),
    "api-keys",
  );
  const [form, setForm] = useState({
    provider: "OPENAI" as (typeof INTEGRATION_PROVIDERS)[number],
    label: "",
    secret: "",
  });

  if (!enabled) return null;

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    feedback.clear();
    try {
      const result = await createMutation.mutateAsync(form);
      feedback.setSuccess(result.message);
      setForm({ provider: "OPENAI", label: "", secret: "" });
    } catch (error) {
      feedback.fromError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>
          Encrypted integration secrets — plaintext is never returned by the API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-3 lg:grid-cols-3" onSubmit={onCreate}>
          <select
            className={selectClassName}
            aria-label="Provider"
            value={form.provider}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                provider: e.target.value as typeof f.provider,
              }))
            }
          >
            {INTEGRATION_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <Input
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
          <Input
            type="password"
            placeholder="Secret"
            value={form.secret}
            onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
            required
          />
          <Button
            type="submit"
            className="sm:col-span-3"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Saving…" : "Store encrypted key"}
          </Button>
        </form>
        <Feedback error={feedback.error} success={feedback.success} />
        {query.isLoading && !query.data ? (
          <LoadingState label="Loading API keys" />
        ) : query.isError && !query.data ? (
          <ErrorState
            title="Unable to load API keys"
            description={
              query.error instanceof ApiClientError
                ? query.error.message
                : "Please try again."
            }
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.items.length ? (
          <EmptyState
            icon={KeyRound}
            title="No API keys"
            description="Store an encrypted integration key to get started."
            className="min-h-[160px] sm:min-h-[180px]"
          />
        ) : (
          <ul className="space-y-2">
            {query.data.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {item.provider} · {item.label} · ••••{item.secretLast4}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => void deleteMutation.mutateAsync(item.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});

export const BackupSection = memo(function BackupSection({
  enabled,
}: {
  enabled: boolean;
}) {
  const feedback = useSaveState();
  const query = useSettingsBackups(enabled);
  const mutation = useSettingsMutation(
    settingsService.createBackup,
    "backups",
  );

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup</CardTitle>
        <CardDescription>
          Manual backups and history. Restore automation is prepared for later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Feedback error={feedback.error} success={feedback.success} />
          <Button
            disabled={mutation.isPending}
            onClick={() =>
              void mutation
                .mutateAsync({ type: "MANUAL" })
                .then((r) => feedback.setSuccess(r.message))
                .catch(feedback.fromError)
            }
          >
            {mutation.isPending ? "Running…" : "Run manual backup"}
          </Button>
        </div>
        {query.isLoading && !query.data ? (
          <LoadingState label="Loading backups" />
        ) : query.isError && !query.data ? (
          <ErrorState
            title="Unable to load backups"
            description={
              query.error instanceof ApiClientError
                ? query.error.message
                : "Please try again."
            }
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.items.length ? (
          <EmptyState
            icon={HardDrive}
            title="No backups yet"
            description="Run a manual backup to create the first snapshot."
            className="min-h-[160px] sm:min-h-[180px]"
          />
        ) : (
          <ul className="space-y-2">
            {query.data.items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                {item.type} · {item.status} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
                {item.message ? ` — ${item.message}` : ""}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
