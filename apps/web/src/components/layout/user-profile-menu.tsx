"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { useAuth, useLogout } from "@/features/auth";
import { cn } from "@/lib/utils";

interface UserProfileMenuProps {
  className?: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
}

export function UserProfileMenu({ className }: UserProfileMenuProps) {
  const router = useRouter();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  if (!user) {
    return null;
  }

  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const initials = getInitials(user.firstName, user.lastName);

  const handleSignOut = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      router.replace(ROUTES.LOGIN);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 gap-2 rounded-lg border border-transparent px-1.5 hover:border-border/60 hover:bg-accent sm:px-2",
            className,
          )}
          aria-label="User menu"
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 text-left md:block">
            <p className="truncate text-sm font-medium leading-4 tracking-tight">
              {displayName}
            </p>
            <p className="truncate text-xs leading-4 text-muted-foreground">
              {user.role.name}
            </p>
          </div>
          <ChevronDown
            className="hidden size-3.5 shrink-0 text-muted-foreground md:block"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1 px-1 py-0.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS}>
            <User className="mr-2 h-4 w-4" aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS_SECURITY}>
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={logoutMutation.isPending}
          onSelect={() => {
            void handleSignOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
