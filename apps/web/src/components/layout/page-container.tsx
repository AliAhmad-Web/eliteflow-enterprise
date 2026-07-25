import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Constrain content on ultra-wide monitors while remaining full-bleed on smaller screens.
   * @default true
   */
  constrain?: boolean;
}

/**
 * Standard page wrapper for dashboard routes — spacing and ultra-wide max-width only.
 * Does not alter visual design of child content.
 */
export function PageContainer({
  children,
  className,
  constrain = true,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 space-y-5 sm:space-y-6 lg:space-y-7",
        constrain && "mx-auto max-w-[1600px] min-[2560px]:max-w-[1920px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
