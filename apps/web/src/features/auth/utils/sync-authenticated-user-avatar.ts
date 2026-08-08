import type { SafeUser } from "@enterprise/shared";
import type { QueryClient } from "@tanstack/react-query";

import { USER_AVATAR_QUERY_KEY } from "../hooks/use-user-avatar-src";
import { useAuthStore } from "../stores/auth.store";
import { AUTH_QUERY_KEYS } from "../types/auth.types";

/** Keep Header + Profile on one avatar source after profile picture changes. */
export function syncAuthenticatedUserAvatar(
  queryClient: QueryClient,
  next: Pick<SafeUser, "avatarUrl"> &
    Partial<Pick<SafeUser, "firstName" | "lastName">>,
) {
  const current = useAuthStore.getState().user;
  if (!current) return;

  const updated: SafeUser = {
    ...current,
    avatarUrl: next.avatarUrl,
    ...(next.firstName !== undefined ? { firstName: next.firstName } : {}),
    ...(next.lastName !== undefined ? { lastName: next.lastName } : {}),
  };

  useAuthStore.getState().setUser(updated);
  queryClient.setQueryData(AUTH_QUERY_KEYS.me, updated);
  // Drop cached blob so Header reloads the new (or empty) picture immediately.
  void queryClient.removeQueries({ queryKey: USER_AVATAR_QUERY_KEY });
}
