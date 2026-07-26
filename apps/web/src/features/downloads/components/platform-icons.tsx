import { cn } from "@/lib/utils";

interface PlatformIconProps {
  className?: string;
}

export function WindowsIcon({ className }: PlatformIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <path d="M3 5.5 10.2 4.4v7.1H3V5.5Zm0 13 7.2 1.1v-7.2H3v6.1ZM11.1 4.25 21 2.8v8.7h-9.9V4.25Zm0 16.95L21 19.75V11.5h-9.9v9.7Z" />
    </svg>
  );
}

export function ChromeIcon({ className }: PlatformIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 8.75h8.1M7.35 15.2 3.9 8.75M16.65 15.2H5.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AndroidIcon({ className }: PlatformIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <path d="M17.6 9.48 19.1 6.9a.55.55 0 0 0-.95-.55l-1.55 2.68a7.9 7.9 0 0 0-9.2 0L5.85 6.35a.55.55 0 1 0-.95.55l1.5 2.58A7.55 7.55 0 0 0 4.2 14.4v.7c0 .5.4.9.9.9h1.1v2.7c0 .55.45 1 1 1s1-.45 1-1v-2.7h5.6v2.7c0 .55.45 1 1 1s1-.45 1-1v-2.7h1.1c.5 0 .9-.4.9-.9v-.7a7.55 7.55 0 0 0-2.2-4.92ZM9.1 12.35a.85.85 0 1 1 0-1.7.85.85 0 0 1 0 1.7Zm5.8 0a.85.85 0 1 1 0-1.7.85.85 0 0 1 0 1.7Z" />
    </svg>
  );
}
