"use client";

import { PERMISSIONS } from "@enterprise/shared";

import { isAiCustomerChatEnabled } from "@/features/ai/feature-flags";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";

/**
 * Single visibility gate for the customer floating AI chat.
 * Staff AI continues to use PERMISSIONS.AI_USE.
 */
export function useCustomerAiChatVisible(): boolean {
  const { isClient } = useRole();
  const canUseCustomerAi = useHasPermission(PERMISSIONS.AI_CUSTOMER);
  return isClient && canUseCustomerAi && isAiCustomerChatEnabled();
}
