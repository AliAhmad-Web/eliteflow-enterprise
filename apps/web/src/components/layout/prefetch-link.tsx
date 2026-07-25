"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  matchKeepAliveRoute,
  preloadKeepAliveRoute,
} from "@/lib/navigation/keep-alive-registry";
import { ROUTES } from "@/constants/routes";
import { useNavTransitionStore } from "@/stores/nav-transition.store";

const COMMUNICATION_WARM_ROUTES = new Set<string>([
  ROUTES.MESSAGES,
  ROUTES.CHANNELS,
  ROUTES.THREADS,
  ROUTES.MEETINGS,
  ROUTES.ANNOUNCEMENTS,
  ROUTES.ACTIVITY,
]);

function isCommunicationWarmPath(path: string): boolean {
  if (COMMUNICATION_WARM_ROUTES.has(path)) {
    return true;
  }
  // Dynamic channel chat shares the same hub caches.
  return path.startsWith(`${ROUTES.CHANNELS}/`);
}

let communicationPrefetchStarted = false;

function warmCommunicationDataIfNeeded(path: string) {
  if (!isCommunicationWarmPath(path) || communicationPrefetchStarted) {
    return;
  }
  communicationPrefetchStarted = true;
  void import("@/features/communication/lib/prefetch-communication-hub").then(
    (m) => m.prefetchCommunicationHub(),
  );
}

type PrefetchLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

function resolveHref(href: LinkProps["href"]): string {
  if (typeof href === "string") {
    return href;
  }
  if (href.pathname) {
    const query =
      href.query && typeof href.query === "object"
        ? `?${new URLSearchParams(
            href.query as Record<string, string>,
          ).toString()}`
        : "";
    return `${href.pathname}${query}`;
  }
  return "";
}

/**
 * Instant navigation:
 * 1) Preload feature chunk on hover
 * 2) Set optimistic path so KeepAlive swaps UI on click (no RSC wait)
 * 3) router.push in startTransition (URL + history catch up in background)
 */
export function PrefetchLink({
  href,
  onClick,
  onMouseEnter,
  onFocus,
  children,
  replace,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();
  const setOptimisticPath = useNavTransitionStore((s) => s.setOptimisticPath);
  const hrefString = resolveHref(href);
  const pathOnly = hrefString.split("?")[0] ?? hrefString;

  const warm = useCallback(() => {
    if (!pathOnly) return;
    router.prefetch(pathOnly);
    void preloadKeepAliveRoute(pathOnly);
    // RC#3: do not stampede communication hub APIs on every hover.
  }, [pathOnly, router]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();

      const keepAlive = matchKeepAliveRoute(pathOnly);
      if (keepAlive) {
        // Instant UI swap — do not wait for Next.js flight.
        setOptimisticPath(keepAlive);
        void preloadKeepAliveRoute(keepAlive);
        // Warm hub data once, on navigation into communication — not on hover.
        warmCommunicationDataIfNeeded(keepAlive);
      } else if (isCommunicationWarmPath(pathOnly)) {
        warmCommunicationDataIfNeeded(pathOnly);
      }

      startTransition(() => {
        if (replace) {
          router.replace(hrefString);
        } else {
          router.push(hrefString);
        }
      });
    },
    [hrefString, onClick, pathOnly, replace, router, setOptimisticPath],
  );

  return (
    <Link
      href={href}
      prefetch
      replace={replace}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        onFocus?.(event);
      }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}
