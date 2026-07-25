"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  children: ReactNode;
  className?: string;
}

export function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <>
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <motion.div
        className={cn("w-full", className)}
        initial={slideUp.initial}
        animate={slideUp.animate}
        transition={slideUp.transition}
      >
        {children}
      </motion.div>
    </>
  );
}
