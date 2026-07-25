"use client";

import { useMutation } from "@tanstack/react-query";
import type { VerifyEmailInput } from "@enterprise/shared";

import { authService } from "../services/auth.service";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (input: VerifyEmailInput) => authService.verifyEmail(input),
  });
}
