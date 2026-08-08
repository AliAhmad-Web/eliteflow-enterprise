"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { useUserAvatarSrc } from "../hooks/use-user-avatar-src";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
}

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  /** When omitted, uses authenticated user's avatarUrl from auth store. */
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
}

/**
 * Canonical user avatar for Header / Profile — one resolver, auth-backed source.
 */
export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  className,
  fallbackClassName,
  alt,
}: UserAvatarProps) {
  const { src } = useUserAvatarSrc(avatarUrl);
  const initials = getInitials(firstName, lastName);
  const label = alt ?? (`${firstName} ${lastName}`.trim() || "User");

  return (
    <Avatar className={cn(className)}>
      {src ? <AvatarImage src={src} alt={label} /> : null}
      <AvatarFallback className={cn(fallbackClassName)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
