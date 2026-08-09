export const DEEP_LINK_PARAMS = {
  OPEN: "open",
  FROM: "from",
  NOTIFICATION_ID: "nid",
  ACTION: "action",
  HIGHLIGHT: "highlight",
  SOURCE: "src",
} as const;

export type DeepLinkActionType = "view" | "discuss" | "preview";

const DEEP_LINK_CLEAR_KEYS = [
  DEEP_LINK_PARAMS.OPEN,
  DEEP_LINK_PARAMS.FROM,
  DEEP_LINK_PARAMS.NOTIFICATION_ID,
  DEEP_LINK_PARAMS.ACTION,
  DEEP_LINK_PARAMS.HIGHLIGHT,
  DEEP_LINK_PARAMS.SOURCE,
  "event",
  "file",
] as const;

/**
 * Strip entity deep-link query keys. Returns `changed: false` when nothing to clear
 * so callers can avoid a no-op App Router `replace` during modal teardown.
 */
export function stripDeepLinkSearchParams(
  searchParams: URLSearchParams,
): { next: URLSearchParams; changed: boolean } {
  const next = new URLSearchParams(searchParams.toString());
  let changed = false;

  for (const key of DEEP_LINK_CLEAR_KEYS) {
    if (next.has(key)) {
      next.delete(key);
      changed = true;
    }
  }

  if (
    searchParams.get(DEEP_LINK_PARAMS.FROM) === "notification" &&
    next.has("id")
  ) {
    next.delete("id");
    changed = true;
  }

  return { next, changed };
}

export function parseDeepLinkSearchParams(
  searchParams: URLSearchParams,
): {
  openId: string | null;
  fromNotification: boolean;
  notificationId: string | null;
  actionType: DeepLinkActionType;
  highlight: boolean;
  sourceModule: string | null;
} {
  const openId =
    searchParams.get(DEEP_LINK_PARAMS.OPEN) ??
    searchParams.get("event") ??
    searchParams.get("file") ??
    searchParams.get("id");

  const actionRaw = searchParams.get(DEEP_LINK_PARAMS.ACTION);
  const actionType: DeepLinkActionType =
    actionRaw === "discuss" || actionRaw === "preview" ? actionRaw : "view";

  return {
    openId: openId && openId.length > 0 ? openId : null,
    fromNotification: searchParams.get(DEEP_LINK_PARAMS.FROM) === "notification",
    notificationId: searchParams.get(DEEP_LINK_PARAMS.NOTIFICATION_ID),
    actionType,
    highlight: searchParams.get(DEEP_LINK_PARAMS.HIGHLIGHT) !== "0",
    sourceModule: searchParams.get(DEEP_LINK_PARAMS.SOURCE),
  };
}
