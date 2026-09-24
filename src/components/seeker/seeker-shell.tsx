"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useRole } from "@/lib/auth/role-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/seeker/dashboard", label: "Dashboard" },
  { href: "/seeker/jobs", label: "Find jobs" },
  { href: "/seeker/applications", label: "Applications" },
  { href: "/seeker/profile", label: "My profile" },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function SeekerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  const name = session?.name ?? "";
  const initials = initialsOf(name);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 flex h-17 items-center justify-between border-b bg-card px-4 md:px-12">
        <div className="flex items-center gap-10">
          <Logo href="/seeker/dashboard" />
          <nav className="hidden items-center gap-1 text-[15px] font-semibold md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center rounded-lg px-3.5 transition-colors",
                    active ? "bg-primary-soft text-primary-soft-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button type="button" variant="ghost" size="icon-lg" aria-label="Notifications">
            <Bell className="size-5" aria-hidden />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="ghost" size="icon-lg" aria-label="Account menu" />}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-foreground">
                {initials}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem render={<Link href="/seeker/profile" />}>My profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={<Button type="button" variant="ghost" size="icon-lg" aria-label="Open menu" className="md:hidden" />}
            >
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs gap-0">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 py-2 text-base font-semibold">
                {NAV_ITEMS.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <SheetClose
                      key={item.href}
                      render={
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-11 items-center rounded-lg px-3",
                            active ? "bg-primary-soft text-primary-soft-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground"
                          )}
                        />
                      }
                    >
                      {item.label}
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-12 md:py-8">{children}</main>
    </div>
  );
}
