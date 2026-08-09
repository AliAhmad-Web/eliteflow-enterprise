"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  scheduleAfterOverlayClose,
  scheduleRestoreBodyInteraction,
} from "@/lib/ui/body-interaction";

import {
  parseDeepLinkSearchParams,
  stripDeepLinkSearchParams,
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
  }, [parsed.openId, parsed.fromNotification]);

  const clearDeepLinkParams = () => {
    const { next, changed } = stripDeepLinkSearchParams(
      new URLSearchParams(searchParams.toString()),
    );

    // Always schedule a body-interaction restore after detail/modal close.
    scheduleRestoreBodyInteraction();

    // Critical: never call router.replace when URL is unchanged. A no-op soft
    // navigation during Radix Dialog teardown races DismissableLayer cleanup and
    // can leave `document.body.style.pointerEvents = "none"` permanently.
    if (!changed) return;

    const qs = next.toString();
    const path =
      typeof window !== "undefined" ? window.location.pathname : "";
    const href = qs ? `${path}?${qs}` : path;

    scheduleAfterOverlayClose(() => {
      router.replace(href, { scroll: false });
      scheduleRestoreBodyInteraction();
    }, 0);
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
