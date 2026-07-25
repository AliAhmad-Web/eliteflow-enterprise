"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { UiStoreHydration } from "@/components/providers/ui-store-hydration";
import { WebVitalsReporter } from "@/components/providers/web-vitals-reporter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/components/auth-provider";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      themes={["light", "dark", "emerald", "sapphire", "system"]}
      disableTransitionOnChange={false}
    >
      <QueryProvider>
        <AuthProvider>
          <UiStoreHydration />
          <TooltipProvider delayDuration={200}>
            <WebVitalsReporter />
            {children}
          </TooltipProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
