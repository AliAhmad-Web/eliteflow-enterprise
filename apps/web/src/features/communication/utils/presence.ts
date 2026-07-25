import type { UserPresenceDto } from "@enterprise/shared";

export function formatLastSeen(
  presence?: Pick<UserPresenceDto, "isOnline" | "lastSeenAt"> | null,
  now = Date.now(),
): string {
  if (!presence) return "Offline";
  if (presence.isOnline) return "Active now";

  const lastSeenAt = presence.lastSeenAt
    ? new Date(presence.lastSeenAt).getTime()
    : NaN;
  if (!Number.isFinite(lastSeenAt)) return "Offline";

  const deltaMs = Math.max(0, now - lastSeenAt);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Last seen ${days}d ago`;
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString()}`;
}

export function formatTypingLabel(names: string[]): string | null {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  if (unique.length === 1) return `${unique[0]} is typing…`;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]} are typing…`;
  return `${unique[0]} and ${unique.length - 1} others are typing…`;
}

export function buildPresenceMap(
  rows: UserPresenceDto[] | undefined,
): Map<string, UserPresenceDto> {
  const map = new Map<string, UserPresenceDto>();
  for (const row of rows ?? []) {
    map.set(row.userId, row);
  }
  return map;
}

export function onlineUserIds(
  rows: UserPresenceDto[] | undefined,
): Set<string> {
  const set = new Set<string>();
  for (const row of rows ?? []) {
    if (row.isOnline) set.add(row.userId);
  }
  return set;
}
