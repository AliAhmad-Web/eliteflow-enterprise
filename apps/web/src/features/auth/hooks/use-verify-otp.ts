"use client";

import { useMutation } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import { setSessionHintCookie } from "../utils/session-hint";

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (input: { otpSessionId: string; code: string }) => {
      const result = await authService.verifyOtp(input);
      setSessionHintCookie();
      return result;
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (otpSessionId: string) => authService.resendOtp(otpSessionId),
  });
}
