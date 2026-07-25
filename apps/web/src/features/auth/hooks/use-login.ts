"use client";

import { useMutation } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import type { LoginServiceInput } from "../types/auth.types";

/**
 * Password login only. Does not set the session hint until tokens exist
 * (OTP-required responses must not look like an authenticated session).
 */
export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginServiceInput) => {
      return authService.login(input);
    },
  });
}
