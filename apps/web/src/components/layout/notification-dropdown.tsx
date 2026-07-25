"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { DashboardNotification } from "@/features/dashboard/types/dashboard.types";

const typeStyles = {
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
} as const;

interface NotificationDropdownProps {
  notifications: DashboardNotification[];
  className?: string;
}

export function NotificationDropdown({
  notifications: initialNotifications,
  className,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative hover:bg-primary/10 hover:text-primary", className)}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] shadow-(--shadow-xs)"
            >
              {unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 overflow-hidden p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} unread
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-default flex-col items-start gap-1 p-3 focus:bg-accent"
              >
                <div className="flex w-full items-start gap-2">
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      typeStyles[notification.type],
                      !notification.read &&
                        "ring-2 ring-offset-1 ring-offset-popover",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm",
                        notification.read
                          ? "font-normal text-muted-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.description}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-primary"
          disabled={unreadCount === 0}
          onSelect={(event) => {
            event.preventDefault();
            markAllAsRead();
          }}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all as read
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
