"use client";

import { ArrowLeft, Check, CircleHelp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { selectClassName } from "./team-shared";

const WIZARD_HISTORY_KEY = "eliteflowTeamWizard";

export const hireSelectClassName = cn(
  selectClassName,
  "h-11 px-3.5 text-[15px] leading-none",
);

export const formGridClassName =
  "grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2";

export function HireInput({ className, ...props }: InputProps) {
  return (
    <Input className={cn("h-11 px-3.5 text-[15px]", className)} {...props} />
  );
}

export type WizardStepDef = {
  id: number;
  title: string;
  short: string;
};

export function WizardStepper({
  steps,
  currentStep,
  progressPercent,
  onStepChange,
}: {
  steps: readonly WizardStepDef[];
  currentStep: number;
  progressPercent: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <nav
      aria-label="Registration steps"
      className="sticky top-0 z-10 rounded-2xl border border-border/50 bg-card/95 px-4 py-5 shadow-[var(--shadow-xs)] backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:px-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          Step {currentStep} of {steps.length}
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          {progressPercent}% complete
        </p>
      </div>
      <div
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Registration progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{
            width: `${Math.max(progressPercent, currentStep === 1 ? 8 : progressPercent)}%`,
          }}
        />
      </div>
      <ol className="flex items-start justify-between gap-1 overflow-x-auto">
        {steps.map(({ id, title, short }, index) => {
          const active = id === currentStep;
          const completed = id < currentStep;
          return (
            <li
              key={id}
              className="relative flex min-w-[4.5rem] flex-1 flex-col items-center"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[calc(50%+1.15rem)] right-[calc(-50%+1.15rem)] top-[1.125rem] h-0.5",
                    completed ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (id <= currentStep) onStepChange(id);
                }}
                disabled={id > currentStep}
                className={cn(
                  "relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                  active &&
                    "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
                  completed &&
                    !active &&
                    "border-primary bg-primary text-primary-foreground",
                  !active &&
                    !completed &&
                    "border-border bg-muted/40 text-muted-foreground",
                  id <= currentStep && "cursor-pointer hover:opacity-90",
                )}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${id}: ${title}${completed ? " (completed)" : ""}`}
              >
                {completed && !active ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  id
                )}
              </button>
              <span
                className={cn(
                  "mt-2.5 text-center text-[11px] font-medium leading-tight sm:text-xs",
                  active
                    ? "text-primary"
                    : completed
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span className="hidden sm:inline">{title}</span>
                <span className="sm:hidden">{short}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-xs)]">
      <header className="flex items-start gap-3.5 border-b border-border/40 px-6 py-5 sm:px-8">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </header>
      <div className="px-6 py-7 sm:px-8 sm:py-8">{children}</div>
    </section>
  );
}

export function WizardField({
  label,
  htmlFor,
  children,
  error,
  hint,
  required,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-0.5 text-primary" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function WizardHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      aria-label="Open help"
    >
      <CircleHelp className="h-4 w-4 text-primary" />
      Help
    </button>
  );
}

/** Top-left back control for Add Employee / Add Admin wizards. */
export function WizardBackButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      disabled={disabled}
      aria-label="Back"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </Button>
  );
}

export function WizardLeaveConfirmDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onStay();
      }}
    >
      <DialogContent
        className="sm:max-w-md [&>button.absolute]:hidden"
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onStay();
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Are you sure you want to leave this page?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onStay}>
            Stay on Page
          </Button>
          <Button type="button" variant="destructive" onClick={onLeave}>
            Leave Without Saving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Guards wizard leave via Back, Cancel, Esc, and browser Back.
 * Preserves Team list state by closing the in-page wizard only.
 */
export function useWizardLeaveGuard({
  open,
  isDirty,
  allowLeaveWithoutConfirm,
  blockEscape = false,
  onLeave,
}: {
  open: boolean;
  isDirty: boolean;
  allowLeaveWithoutConfirm: boolean;
  /** When true (e.g. help drawer open), Esc is not treated as leave. */
  blockEscape?: boolean;
  onLeave: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const historyPushedRef = useRef(false);
  const skipPopRef = useRef(false);
  const onLeaveRef = useRef(onLeave);
  const isDirtyRef = useRef(isDirty);
  const allowLeaveRef = useRef(allowLeaveWithoutConfirm);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    allowLeaveRef.current = allowLeaveWithoutConfirm;
  }, [allowLeaveWithoutConfirm]);

  const completeLeave = useCallback(() => {
    setConfirmOpen(false);
    if (historyPushedRef.current) {
      skipPopRef.current = true;
      historyPushedRef.current = false;
      window.history.back();
    }
    onLeaveRef.current();
  }, []);

  const requestLeave = useCallback(() => {
    if (allowLeaveRef.current || !isDirtyRef.current) {
      completeLeave();
      return;
    }
    setConfirmOpen(true);
  }, [completeLeave]);

  const stayOnPage = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      return;
    }

    window.history.pushState({ [WIZARD_HISTORY_KEY]: true }, "");
    historyPushedRef.current = true;

    const onPopState = () => {
      if (skipPopRef.current) {
        skipPopRef.current = false;
        return;
      }

      historyPushedRef.current = false;

      if (allowLeaveRef.current || !isDirtyRef.current) {
        onLeaveRef.current();
        return;
      }

      window.history.pushState({ [WIZARD_HISTORY_KEY]: true }, "");
      historyPushedRef.current = true;
      setConfirmOpen(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (blockEscape || confirmOpen) return;
      event.preventDefault();
      event.stopPropagation();
      requestLeave();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, blockEscape, confirmOpen, requestLeave]);

  useEffect(() => {
    if (!open || allowLeaveWithoutConfirm || !isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, isDirty, allowLeaveWithoutConfirm]);

  return {
    requestLeave,
    confirmOpen,
    stayOnPage,
    confirmLeave: completeLeave,
  };
}

/** Persist design-only HR meta without schema changes (round-trips via bio). */
export function encodeHrMeta(fields: {
  nationality?: string;
  religion?: string;
  province?: string;
  postalCode?: string;
}): string | null {
  const lines: string[] = [];
  if (fields.nationality?.trim()) {
    lines.push(`Nationality: ${fields.nationality.trim()}`);
  }
  if (fields.religion?.trim()) {
    lines.push(`Religion: ${fields.religion.trim()}`);
  }
  if (fields.province?.trim()) {
    lines.push(`Province: ${fields.province.trim()}`);
  }
  if (fields.postalCode?.trim()) {
    lines.push(`Postal Code: ${fields.postalCode.trim()}`);
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

export function decodeHrMeta(bio: string | null | undefined): {
  nationality: string;
  religion: string;
  province: string;
  postalCode: string;
} {
  const result = {
    nationality: "",
    religion: "",
    province: "",
    postalCode: "",
  };
  if (!bio) return result;
  for (const line of bio.split("\n")) {
    const nationality = line.match(/^Nationality:\s*(.+)$/i)?.[1];
    const religion = line.match(/^Religion:\s*(.+)$/i)?.[1];
    const province = line.match(/^Province:\s*(.+)$/i)?.[1];
    const postalCode = line.match(/^Postal Code:\s*(.+)$/i)?.[1];
    if (nationality) result.nationality = nationality.trim();
    if (religion) result.religion = religion.trim();
    if (province) result.province = province.trim();
    if (postalCode) result.postalCode = postalCode.trim();
  }
  return result;
}
