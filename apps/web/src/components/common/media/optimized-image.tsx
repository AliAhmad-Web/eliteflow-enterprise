"use client";

import NextImage, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

type OptimizedImageProps = Omit<ImageProps, "alt"> & {
  alt: string;
  className?: string;
};

/**
 * Thin next/image wrapper with sensible defaults for ERP media (avatars, logos).
 */
export function OptimizedImage({
  className,
  sizes = "(max-width: 768px) 100vw, 320px",
  ...props
}: OptimizedImageProps) {
  return (
    <NextImage
      className={cn("h-auto max-w-full", className)}
      sizes={sizes}
      {...props}
    />
  );
}
