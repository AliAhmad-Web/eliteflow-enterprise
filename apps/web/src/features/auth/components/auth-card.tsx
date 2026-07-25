"use client";

import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  showBranding?: boolean;
}

export function AuthCard({
  title,
  description,
  children,
  className,
  showBranding = true,
}: AuthCardProps) {
  return (
    <Card className={cn("border-border/50 shadow-[var(--shadow-lg)] backdrop-blur-sm", className)}>
      <CardHeader className="space-y-2 text-center">
        {showBranding ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {siteConfig.name}
          </p>
        ) : null}
        <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
