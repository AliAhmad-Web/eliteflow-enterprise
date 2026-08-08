"use client";

import { parseInternalManagedFileId } from "@enterprise/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { settingsService } from "@/features/settings/services/settings.service";

import { useAuthStore } from "../stores/auth.store";

export const USER_AVATAR_QUERY_KEY = ["auth", "avatar-blob"] as const;

export function userAvatarBlobQueryKey(
  userId: string,
  avatarUrl: string,
): readonly unknown[] {
  return [...USER_AVATAR_QUERY_KEY, userId, avatarUrl] as const;
}

function isRemoteAvatarUrl(avatarUrl: string): boolean {
  return (
    /^https?:\/\//i.test(avatarUrl) &&
    parseInternalManagedFileId(avatarUrl) === null
  );
}

/**
 * Resolves the authenticated user's avatar into an <img>-ready src.
 * Canonical source is auth-store `user.avatarUrl` (same account for Header + Profile).
 * Internal File Manager paths are loaded with auth; remote HTTPS URLs are used as-is.
 */
export function useUserAvatarSrc(avatarUrlOverride?: string | null) {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const avatarUrl =
    avatarUrlOverride !== undefined
      ? avatarUrlOverride
      : (user?.avatarUrl ?? null);

  const managedId = avatarUrl ? parseInternalManagedFileId(avatarUrl) : null;
  const isRemote = Boolean(avatarUrl && isRemoteAvatarUrl(avatarUrl));

  const blobQuery = useQuery({
    queryKey: userAvatarBlobQueryKey(userId ?? "anonymous", avatarUrl ?? ""),
    enabled: Boolean(userId && managedId),
    queryFn: async () => {
      if (!managedId) return null;
      // Self-only profile asset download — never exposes other users' files.
      return settingsService.downloadProfileDocumentBlob(managedId);
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setSrc(null);
      return;
    }

    if (isRemote) {
      setSrc(avatarUrl);
      return;
    }

    if (!managedId) {
      setSrc(null);
      return;
    }

    if (!blobQuery.data) {
      setSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blobQuery.data);
    setSrc(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl, isRemote, managedId, blobQuery.data]);

  return {
    src,
    isLoading: Boolean(managedId && blobQuery.isLoading),
    hasAvatar: Boolean(avatarUrl),
    avatarUrl,
    userId,
  };
}
