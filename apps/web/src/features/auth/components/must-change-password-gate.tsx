"use client";

import { changePasswordSchema, type ChangePasswordInput } from "@enterprise/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePasswordSecurity } from "@/features/security/hooks/use-security-mutations";
import { ApiClientError } from "@/services/api/api-error";

import { useAuthStore } from "../stores/auth.store";

export function MustChangePasswordGate() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const changePassword = useChangePasswordSecurity();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mustChange = Boolean(user?.mustChangePassword);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync(values);
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
      form.reset();
    } catch {
      // Error surfaced below via mutation state.
    }
  });

  return (
    <Dialog open={mustChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change your password
          </DialogTitle>
          <DialogDescription>
            For security, you must set a new password before continuing.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="must-change-current">Current password</Label>
            <Input
              id="must-change-current"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="must-change-new">New password</Label>
            <Input
              id="must-change-new"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="must-change-confirm">Confirm new password</Label>
            <Input
              id="must-change-confirm"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
          </div>
          {form.formState.errors.root ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          {changePassword.error instanceof ApiClientError ? (
            <p className="text-sm text-destructive">{changePassword.error.message}</p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
