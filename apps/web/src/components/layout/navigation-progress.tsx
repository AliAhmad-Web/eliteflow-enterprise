"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { matchKeepAliveRoute } from "@/lib/navigation/keep-alive-registry";
import { cn } from "@/lib/utils";
import { useNavTransitionStore } from "@/stores/nav-transition.store";

/**
 * Thin top progress for navigations. Keep-alive hits finish almost instantly.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const optimisticPath = useNavTransitionStore((s) => s.optimisticPath);
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const target = optimisticPath ?? pathname;
    const keepAlive = Boolean(matchKeepAliveRoute(target));

    setVisible(true);
    setComplete(false);

    const doneMs = keepAlive ? 60 : 180;
    const hideMs = keepAlive ? 140 : 420;

    const done = window.setTimeout(() => setComplete(true), doneMs);
    const hide = window.setTimeout(() => setVisible(false), hideMs);

    return () => {
      window.clearTimeout(done);
      window.clearTimeout(hide);
    };
  }, [pathname, searchParams, optimisticPath]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className={cn(
          "h-full bg-primary transition-[width,opacity] duration-150 ease-out",
          complete ? "w-full opacity-0" : "w-2/3 opacity-100",
        )}
      />
    </div>
  );
}
