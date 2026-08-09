"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type LazyExoticComponent,
} from "react";
import { usePathname } from "next/navigation";

import { KeepAlivePageActiveProvider } from "@/components/layout/keep-alive-page-active";
import { ROUTES } from "@/constants/routes";
import {
  getKeepAliveLoader,
  matchKeepAliveRoute,
  preloadKeepAliveRoute,
} from "@/lib/navigation/keep-alive-registry";
import { restoreBodyInteractionIfIdle } from "@/lib/ui/body-interaction";
import { useKeepAliveVisibilityStore } from "@/stores/keep-alive-visibility.store";
import { useNavTransitionStore } from "@/stores/nav-transition.store";

/**
 * Soft-nav cache size. Prefer fewer mounted pages to cut memory/CPU;
 * heavy routes are evicted first when over capacity.
 */
const MAX_CACHED_PAGES = 12;

/** Prefer evicting these before lighter list pages. */
const HEAVY_KEEP_ALIVE = new Set<string>([
  ROUTES.AI_ASSISTANT,
  ROUTES.AI_DOCUMENTS,
  ROUTES.FILE_MANAGER,
  ROUTES.REPORTS,
  ROUTES.TEAM,
  ROUTES.SECURITY,
  ROUTES.WHITEBOARD,
  ROUTES.EMAIL_AUTOMATION,
  ROUTES.VOICE_AI,
  ROUTES.WHATSAPP,
]);
const SCROLL_STORAGE_KEY = "eliteflow-ka-scroll";
const scrollPositions = new Map<string, number>();
const lazyPageCache = new Map<
  string,
  LazyExoticComponent<ComponentType>
>();

function loadScrollPositions(): void {
  if (typeof window === "undefined" || scrollPositions.size > 0) return;
  try {
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number") scrollPositions.set(key, value);
    }
  } catch {
    // ignore
  }
}

function persistScrollPositions(): void {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, number> = {};
    for (const [key, value] of scrollPositions) {
      obj[key] = value;
    }
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function getLazyPage(route: string): LazyExoticComponent<ComponentType> {
  const cached = lazyPageCache.get(route);
  if (cached) {
    return cached;
  }

  const loader = getKeepAliveLoader(route);
  if (!loader) {
    throw new Error(`No keep-alive loader for ${route}`);
  }

  const LazyPage = lazy(loader);
  lazyPageCache.set(route, LazyPage);
  return LazyPage;
}

interface KeepAliveOutletProps {
  children: React.ReactNode;
}

/**
 * Notion-style page cache: visited keep-alive routes stay mounted and hidden.
 * Optimistic path (from PrefetchLink) switches the visible page on click.
 */
export function KeepAliveOutlet({ children }: KeepAliveOutletProps) {
  const pathname = usePathname();
  const optimisticPath = useNavTransitionStore((s) => s.optimisticPath);
  const setOptimisticPath = useNavTransitionStore((s) => s.setOptimisticPath);
  const setActiveRoute = useKeepAliveVisibilityStore((s) => s.setActiveRoute);

  const [spaReady, setSpaReady] = useState(false);

  const activePathname = optimisticPath ?? pathname;
  const activeKeepAlive = matchKeepAliveRoute(activePathname);

  const [mountedRoutes, setMountedRoutes] = useState<string[]>(() => {
    loadScrollPositions();
    const initial = matchKeepAliveRoute(pathname);
    return initial ? [initial] : [];
  });

  const prevActiveRef = useRef<string | null>(null);

  // RC#7: useLayoutEffect + preload current chunk before paint to minimize handoff flash.
  useLayoutEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const route = matchKeepAliveRoute(window.location.pathname);
      if (route) {
        await preloadKeepAliveRoute(route);
      }
      if (!cancelled) {
        setSpaReady(true);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (optimisticPath && matchKeepAliveRoute(pathname) === optimisticPath) {
      setOptimisticPath(null);
    }
  }, [pathname, optimisticPath, setOptimisticPath]);

  // Safety net: clear leaked Radix body pointer-events after soft navigations.
  useEffect(() => {
    restoreBodyInteractionIfIdle();
    const timer = window.setTimeout(() => restoreBodyInteractionIfIdle(), 50);
    return () => window.clearTimeout(timer);
  }, [pathname, activeKeepAlive]);

  // RC#5: publish active keep-alive route for poll/heartbeat gating.
  useEffect(() => {
    setActiveRoute(activeKeepAlive);
    return () => {
      setActiveRoute(null);
    };
  }, [activeKeepAlive, setActiveRoute]);

  useEffect(() => {
    if (!activeKeepAlive) {
      return;
    }

    void preloadKeepAliveRoute(activeKeepAlive);

    setMountedRoutes((current) => {
      if (current.includes(activeKeepAlive)) {
        return current;
      }
      const next = [...current, activeKeepAlive];
      while (next.length > MAX_CACHED_PAGES) {
        let evictIndex = next.findIndex(
          (route) =>
            route !== activeKeepAlive &&
            (HEAVY_KEEP_ALIVE.has(route) || route.startsWith("/files/")),
        );
        if (evictIndex < 0) {
          evictIndex = next.findIndex((route) => route !== activeKeepAlive);
        }
        if (evictIndex < 0) break;
        const evicted = next[evictIndex]!;
        scrollPositions.delete(evicted);
        lazyPageCache.delete(evicted);
        next.splice(evictIndex, 1);
      }
      return next;
    });
  }, [activeKeepAlive]);

  useLayoutEffect(() => {
    if (!spaReady || !activeKeepAlive) {
      return;
    }

    const main = document.getElementById("main-content");
    if (!main) {
      return;
    }

    const prev = prevActiveRef.current;
    if (prev && prev !== activeKeepAlive) {
      scrollPositions.set(prev, main.scrollTop);
      persistScrollPositions();
    }

    prevActiveRef.current = activeKeepAlive;
    main.scrollTop = scrollPositions.get(activeKeepAlive) ?? 0;
  }, [activeKeepAlive, spaReady]);

  const pages = useMemo(() => {
    const routes =
      activeKeepAlive && !mountedRoutes.includes(activeKeepAlive)
        ? [...mountedRoutes, activeKeepAlive]
        : mountedRoutes;

    return routes.map((route) => {
      const LazyPage = getLazyPage(route);
      const active = route === activeKeepAlive;
      const hiddenStyle: CSSProperties | undefined = active
        ? undefined
        : {
            contentVisibility: "hidden",
            containIntrinsicSize: "1px 800px",
          };

      return (
        <div
          key={route}
          hidden={!active}
          aria-hidden={!active}
          data-keep-alive-route={route}
          data-keep-alive-active={active ? "true" : "false"}
          className={active ? undefined : "pointer-events-none"}
          style={hiddenStyle}
          ref={(node) => {
            if (node) {
              if (!active) {
                node.setAttribute("inert", "");
              } else {
                node.removeAttribute("inert");
              }
            }
          }}
        >
          <KeepAlivePageActiveProvider active={active}>
            <Suspense fallback={null}>
              <LazyPage />
            </Suspense>
          </KeepAlivePageActiveProvider>
        </div>
      );
    });
  }, [mountedRoutes, activeKeepAlive]);

  // RC#7: once ready, prefer keep-alive tree; before ready keep SSR children (hydration).
  if (!spaReady) {
    return <>{children}</>;
  }

  if (!activeKeepAlive) {
    return <>{children}</>;
  }

  return <>{pages}</>;
}
