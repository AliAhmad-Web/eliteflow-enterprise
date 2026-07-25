"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { cn } from "@/lib/utils";

interface VirtualizedListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  /** Max height of the scroll viewport */
  heightClassName?: string;
  getItemKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

/**
 * Windowed list for long collections. Keeps existing row UI via renderItem.
 */
export function VirtualizedList<T>({
  items,
  estimateSize = 64,
  overscan = 8,
  className,
  heightClassName = "max-h-[min(70vh,720px)]",
  getItemKey,
  renderItem,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getItemKey(items[index]!, index),
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-y-auto overflow-x-hidden", heightClassName, className)}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]!;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
