"use client";

import { PERMISSIONS } from "@enterprise/shared";
import type {
  CreateConversationInput,
  ConversationTypeValue,
} from "@enterprise/shared";
import { Search, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { useEmployees } from "@/features/team/hooks/use-team";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import { useCreateConversation } from "../hooks/use-communication-mutations";
import { CONVERSATION_TYPE_LABELS } from "../types/communication.types";

const CHANNEL_TYPES: ConversationTypeValue[] = [
  "GROUP",
  "TEAM",
  "DEPARTMENT",
  "ORGANIZATION",
];

type MemberOption = {
  id: string;
  label: string;
  email: string;
};

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (channelId: string) => void;
}

function formatCreateError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.errors.length > 0) {
      return err.errors.map((item) => item.message).join(" · ");
    }
    if (err.message && err.message !== "Validation failed") {
      return err.message;
    }
    return "Check the form fields and try again.";
  }
  if (err instanceof Error) return err.message;
  return "Failed to create channel.";
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateChannelDialogProps) {
  const canWriteChat = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const canWriteComm = useHasPermission(PERMISSIONS.COMMUNICATION_WRITE);
  const canWrite = canWriteChat || canWriteComm;
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const createMut = useCreateConversation();
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    page: 1,
    limit: 100,
    search: "",
  });

  const [type, setType] = useState<ConversationTypeValue>("GROUP");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const people = useMemo((): MemberOption[] => {
    const map = new Map<string, MemberOption>();
    for (const employee of employeesData?.items ?? []) {
      if (!employee.userId || employee.userId === currentUserId) continue;
      const first = employee.user?.firstName ?? "";
      const last = employee.user?.lastName ?? "";
      const email = employee.user?.email ?? "";
      const label = `${first} ${last}`.trim() || email || "Team member";
      map.set(employee.userId, { id: employee.userId, label, email });
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [employeesData?.items, currentUserId]);

  const filteredPeople = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const selectedIds = new Set(selectedMembers.map((m) => m.id));
    return people
      .filter((person) => !selectedIds.has(person.id))
      .filter((person) => {
        if (!q) return true;
        return (
          person.label.toLowerCase().includes(q) ||
          person.email.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [people, memberQuery, selectedMembers]);

  function reset() {
    setType("GROUP");
    setName("");
    setDescription("");
    setMemberQuery("");
    setSelectedMembers([]);
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError("Channel name is required.");
      return;
    }
    if (selectedMembers.length < 1) {
      setError("Add at least one member.");
      return;
    }

    const input: CreateConversationInput = {
      type,
      name: name.trim(),
      description: description.trim() || null,
      memberIds: selectedMembers.map((m) => m.id),
    };

    try {
      const created = await createMut.mutateAsync(input);
      reset();
      onOpenChange(false);
      onCreated?.(created.id);
    } catch (err) {
      setError(formatCreateError(err));
    }
  }

  if (!canWrite) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="channel-type">
              Type
            </label>
            <select
              id="channel-type"
              value={type}
              onChange={(e) => setType(e.target.value as ConversationTypeValue)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {CHANNEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONVERSATION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="channel-name">
              Name
            </label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. engineering"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="channel-desc"
            >
              Description
            </label>
            <Input
              id="channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              maxLength={1000}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Members
            </label>
            {selectedMembers.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {selectedMembers.map((m) => (
                  <li
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
                  >
                    {m.label}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setSelectedMembers((prev) =>
                          prev.filter((x) => x.id !== m.id),
                        )
                      }
                      aria-label={`Remove ${m.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search members…"
                className="h-9 pl-8"
              />
            </div>
            <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
              {employeesLoading ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  Loading people…
                </li>
              ) : filteredPeople.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  No matches
                </li>
              ) : (
                filteredPeople.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50",
                      )}
                      onClick={() => {
                        setSelectedMembers((prev) => [...prev, person]);
                        setMemberQuery("");
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{person.label}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {person.email}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={createMut.isPending}
            onClick={() => void handleCreate()}
          >
            {createMut.isPending ? "Creating…" : "Create channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
