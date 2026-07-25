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

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (conversationId: string) => void;
}

type MemberOption = {
  id: string;
  label: string;
  email: string;
};

const SELECTABLE_TYPES: ConversationTypeValue[] = [
  "DIRECT",
  "GROUP",
  "PROJECT",
  "CLIENT",
];

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
  return "Failed to create conversation.";
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: NewConversationDialogProps) {
  const canWrite = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const createMut = useCreateConversation();
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    page: 1,
    limit: 100,
    search: "",
  });

  const [type, setType] = useState<ConversationTypeValue>("DIRECT");
  const [name, setName] = useState("");
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
      map.set(employee.userId, {
        id: employee.userId,
        label,
        email,
      });
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
    setType("DIRECT");
    setName("");
    setMemberQuery("");
    setSelectedMembers([]);
    setError(null);
  }

  function addMember(person: MemberOption) {
    setSelectedMembers((prev) => {
      if (type === "DIRECT") return [person];
      if (prev.some((item) => item.id === person.id)) return prev;
      return [...prev, person];
    });
    setMemberQuery("");
    setError(null);
  }

  function removeMember(id: string) {
    setSelectedMembers((prev) => prev.filter((item) => item.id !== id));
    setError(null);
  }

  function resolveQueryMember(): MemberOption | null {
    const raw = memberQuery.trim();
    if (!raw) return null;

    const match = people.find(
      (person) =>
        person.email.toLowerCase() === raw.toLowerCase() ||
        person.label.toLowerCase() === raw.toLowerCase(),
    );
    if (match) return match;

    if (raw.includes("@")) {
      return { id: raw, label: raw, email: raw };
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);

    let members = [...selectedMembers];
    if (memberQuery.trim()) {
      const fromQuery = resolveQueryMember();
      if (!fromQuery) {
        setError(
          "Select a person from the list, or enter a full email like admin@eliteflow.dev",
        );
        return;
      }
      if (!members.some((m) => m.id === fromQuery.id)) {
        members =
          type === "DIRECT" ? [fromQuery] : [...members, fromQuery];
      }
      setMemberQuery("");
    }

    if (type !== "DIRECT" && !name.trim()) {
      setError("Enter a conversation name.");
      return;
    }

    if (members.length === 0) {
      setError(
        type === "DIRECT"
          ? "Choose one person for this direct message."
          : "Add at least one member.",
      );
      return;
    }

    if (type === "DIRECT" && members.length !== 1) {
      setError("Direct messages require exactly one other person.");
      return;
    }

    const input: CreateConversationInput = {
      type,
      memberIds: members.map((member) =>
        member.id.includes("@") ? member.email || member.id : member.id,
      ),
      name: type !== "DIRECT" ? name.trim() : null,
    };

    try {
      const conv = await createMut.mutateAsync(input);
      reset();
      onOpenChange(false);
      onCreated?.(conv.id);
    } catch (err: unknown) {
      setError(formatCreateError(err));
    }
  }

  const showMemberSearch = type !== "DIRECT" || selectedMembers.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            New Conversation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Type</label>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Conversation type"
            >
              {SELECTABLE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setError(null);
                    if (t === "DIRECT" && selectedMembers.length > 1) {
                      setSelectedMembers((prev) => prev.slice(0, 1));
                    }
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50",
                    type === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
                  )}
                >
                  {CONVERSATION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {type !== "DIRECT" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="conv-name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="conv-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Project Alpha Team"
                required
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="conv-members"
              className="text-sm font-medium text-foreground"
            >
              {type === "DIRECT" ? "Person" : "Members"}
            </label>

            {selectedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-foreground"
                  >
                    {member.label}
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={`Remove ${member.label}`}
                      onClick={() => removeMember(member.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {showMemberSearch ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="conv-members"
                  value={memberQuery}
                  onChange={(e) => {
                    setMemberQuery(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const person = resolveQueryMember();
                    if (!person) {
                      setError(
                        "Select a person from the list, or enter a full email like admin@eliteflow.dev",
                      );
                      return;
                    }
                    addMember(person);
                  }}
                  placeholder={
                    type === "DIRECT"
                      ? "Search name or email…"
                      : "Search people, or type an email…"
                  }
                  className="pl-8"
                  autoComplete="off"
                />
              </div>
            ) : null}

            {showMemberSearch && memberQuery.trim() && filteredPeople.length > 0 ? (
              <ul
                className="max-h-40 overflow-y-auto rounded-md border border-border bg-card p-1"
                role="listbox"
                aria-label="Suggested people"
              >
                {filteredPeople.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      role="option"
                      className="flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                      onClick={() => addMember(person)}
                    >
                      <span className="text-sm font-medium text-foreground">
                        {person.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {person.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {employeesLoading ? (
              <p className="text-[11px] text-muted-foreground">
                Loading team members…
              </p>
            ) : people.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Tip: type a demo email such as{" "}
                <span className="font-medium text-foreground">
                  admin@eliteflow.dev
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {type === "DIRECT"
                  ? "Select exactly one person."
                  : "Select people from the list or press Enter after typing an email."}
              </p>
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canWrite || createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
