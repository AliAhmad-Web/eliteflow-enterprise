"use client";

import { useMutation } from "@tanstack/react-query";
import type { ResetPasswordInput } from "@enterprise/shared";

import { authService } from "../services/auth.service";

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => authService.resetPassword(input),
  });
}
