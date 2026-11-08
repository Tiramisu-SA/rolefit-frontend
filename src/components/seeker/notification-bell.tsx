"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notificationService } from "@/lib/api";
import { badgeLabel, bellAriaLabel, internalLink, relativeTime } from "@/lib/notifications";
import type { AppNotification } from "@/lib/types";

const REFRESH_MS = 60_000;

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);

  const latest = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const seq = ++latest.current;
    try {
      const data = await notificationService.listMine();
      if (!mounted.current || seq !== latest.current) return;
      setItems(data.notifications);
      setUnread(data.unreadCount);
      setFailed(false);
    } catch {
      if (mounted.current && seq === latest.current) setFailed(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Deferred so setState is not called synchronously in the effect body (react-hooks/set-state-in-effect).
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  function handleOpenChange(open: boolean) {
    if (!open) return;
    if (unread > 0) {
      setUnread(0);
      // Mark first, then refresh; a failed mark is ignored (the next refresh restores the count).
      void notificationService
        .markAllRead()
        .catch(() => undefined)
        .then(() => refresh());
    } else {
      void refresh();
    }
  }

  const badge = badgeLabel(unread);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-lg" aria-label={bellAriaLabel(unread)} className="relative" />}
      >
        <Bell className="size-5" aria-hidden />
        {badge && (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white"
          >
            {badge}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
        {failed && items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Couldn&apos;t load notifications.</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem key={n.id} render={<Link href={internalLink(n.link)} />} className="items-start gap-2 py-2.5">
              <span
                aria-hidden
                className={n.read ? "mt-1.5 size-2 shrink-0" : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold">{n.title}</span>
                <span className="text-sm text-muted-foreground">{n.body}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(n.createdAt)}</span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
