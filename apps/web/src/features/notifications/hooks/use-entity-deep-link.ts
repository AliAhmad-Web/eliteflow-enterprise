"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  DEEP_LINK_PARAMS,
  parseDeepLinkSearchParams,
  type DeepLinkActionType,
} from "../utils/notification-deep-link";

export interface EntityDeepLinkState {
  openId: string | null;
  fromNotification: boolean;
  notificationId: string | null;
  actionType: DeepLinkActionType;
  highlight: boolean;
  bannerVisible: boolean;
  dismissBanner: () => void;
  clearDeepLinkParams: () => void;
}

/**
 * Consumes notification deep-link query params and opens the exact record.
 */
export function useEntityDeepLink(onOpen?: (openId: string) => void): EntityDeepLinkState {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledRef = useRef<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  const parsed = parseDeepLinkSearchParams(searchParams);

  const handleOpen = useEffectEvent((openId: string, fromNotification: boolean) => {
    onOpen?.(openId);
    if (fromNotification) {
      setBannerVisible(true);
    }
  });

  useEffect(() => {
    if (!parsed.openId) return;
    if (handledRef.current === parsed.openId) return;
    handledRef.current = parsed.openId;
    handleOpen(parsed.openId, parsed.fromNotification);
  }, [parsed.openId, parsed.fromNotification, handleOpen]);

  const clearDeepLinkParams = () => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of [
      DEEP_LINK_PARAMS.OPEN,
      DEEP_LINK_PARAMS.FROM,
      DEEP_LINK_PARAMS.NOTIFICATION_ID,
      DEEP_LINK_PARAMS.ACTION,
      DEEP_LINK_PARAMS.HIGHLIGHT,
      DEEP_LINK_PARAMS.SOURCE,
      "event",
      "file",
    ]) {
      next.delete(key);
    }
    if (searchParams.get(DEEP_LINK_PARAMS.FROM) === "notification") {
      next.delete("id");
    }
    const qs = next.toString();
    const path = window.location.pathname;
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  };

  return {
    openId: parsed.openId,
    fromNotification: parsed.fromNotification,
    notificationId: parsed.notificationId,
    actionType: parsed.actionType,
    highlight: parsed.highlight,
    bannerVisible,
    dismissBanner: () => setBannerVisible(false),
    clearDeepLinkParams,
  };
}
