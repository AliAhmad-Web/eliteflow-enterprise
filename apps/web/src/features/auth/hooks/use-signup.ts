"use client";

import { useMutation } from "@tanstack/react-query";
import type { SignupInput } from "@enterprise/shared";

import { authService } from "../services/auth.service";

export function useSignup() {
  return useMutation({
    mutationFn: (input: SignupInput) => authService.signup(input),
  });
}
