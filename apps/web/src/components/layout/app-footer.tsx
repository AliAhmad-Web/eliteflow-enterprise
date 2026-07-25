import { cn } from "@/lib/utils";

interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer
      className={cn(
        "mt-auto border-t border-border/50 px-4 py-5 lg:px-6",
        className,
      )}
    >
      <div className="flex flex-col items-center justify-between gap-3 text-[11px] tracking-wide text-muted-foreground/80 md:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span>SSL Secured</span>
          <span className="hidden text-border md:inline" aria-hidden="true">
            ·
          </span>
          <span>Automated Backups</span>
          <span className="hidden text-border md:inline" aria-hidden="true">
            ·
          </span>
          <span>Data Protection</span>
          <span className="hidden text-border md:inline" aria-hidden="true">
            ·
          </span>
          <span>99.9% Uptime</span>
          <span className="hidden text-border md:inline" aria-hidden="true">
            ·
          </span>
          <span>AI Powered</span>
        </div>
        <p>© 2026 EliteFlow. All rights reserved.</p>
      </div>
    </footer>
  );
}
