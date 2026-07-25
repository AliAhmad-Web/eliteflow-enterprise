"use client";

import { useMutation } from "@tanstack/react-query";
import type { ForgotPasswordInput } from "@enterprise/shared";

import { authService } from "../services/auth.service";

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => authService.forgotPassword(input),
  });
}
