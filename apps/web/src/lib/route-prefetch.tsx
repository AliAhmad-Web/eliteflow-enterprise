"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Prefetch a route on mount (hover intent alternative for critical nav).
 */
export function useRoutePrefetch(href: string, enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !href) return;
    router.prefetch(href);
  }, [enabled, href, router]);
}

interface PrefetchLinkProps
  extends React.ComponentPropsWithoutRef<typeof Link> {
  prefetchOnHover?: boolean;
}

/**
 * Link that prefeches on hover for snappier ERP navigation.
 */
export function PrefetchLink({
  prefetchOnHover = true,
  onMouseEnter,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();

  return (
    <Link
      {...props}
      onMouseEnter={(event) => {
        if (prefetchOnHover && typeof props.href === "string") {
          router.prefetch(props.href);
        }
        onMouseEnter?.(event);
      }}
    />
  );
}
