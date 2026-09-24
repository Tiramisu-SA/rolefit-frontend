"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Briefcase, Building2, LayoutDashboard, Menu, Moon, Sun } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAsync } from "@/lib/use-async";
import { useRole } from "@/lib/auth/role-context";
import { jobPosting, CURRENT_COMPANY_ID } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recruiter/jobs", label: "Job postings", icon: Briefcase },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function CompanyProfileItem() {
  return (
    <span
      aria-disabled="true"
      className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold text-muted-foreground/70"
    >
      <Building2 className="size-[19px]" aria-hidden />
      Company profile
      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">Soon</span>
    </span>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 text-[15px] font-semibold">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        const link = (
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 transition-colors",
              active ? "bg-primary-soft text-primary-soft-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-[19px]" aria-hidden />
            {item.label}
          </Link>
        );
        return onNavigate ? (
          <SheetClose key={item.href} render={link} />
        ) : (
          <div key={item.href}>{link}</div>
        );
      })}
      <CompanyProfileItem />
    </nav>
  );
}

function WorkspaceCard() {
  const jobsState = useAsync(() => jobPosting.listJobs({ companyId: CURRENT_COMPANY_ID }), []);
  const company = jobsState.data?.[0]?.company;

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      {company ? (
        <CompanyAvatar company={company} size="sm" />
      ) : (
        <span aria-hidden className="size-10 shrink-0 rounded-[10px] bg-muted" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-bold">{company?.name ?? "Your company"}</span>
        <span className="text-xs text-muted-foreground">Company workspace</span>
      </div>
    </div>
  );
}

function AccountMenu({ align, side }: { align: "start" | "end"; side: "top" | "bottom" }) {
  const { session, signOut } = useRole();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const name = session?.name ?? "";
  const initials = initialsOf(name);

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="mt-auto flex w-full items-center gap-3 rounded-xl border-t p-3 pt-4 text-left transition-colors hover:bg-muted"
          />
        }
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-foreground">
          {initials}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold">{name}</span>
          <span className="text-xs text-muted-foreground">Talent acquisition</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="min-w-56">
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          Toggle theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RecruiterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-65 shrink-0 flex-col gap-7 border-r bg-card p-4 lg:flex">
        <div className="flex items-center justify-between px-2">
          <Logo href="/recruiter/dashboard" />
          <span className="rounded-md bg-brand-deep px-2 py-0.5 text-[11px] font-bold text-brand-deep-foreground">RECRUITER</span>
        </div>
        <WorkspaceCard />
        <NavLinks pathname={pathname} />
        <AccountMenu align="start" side="top" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
          <Logo href="/recruiter/dashboard" />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button type="button" variant="ghost" size="icon-lg" aria-label="Open menu" />}>
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs gap-0 p-4">
              <SheetHeader className="p-0 pb-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-7">
                <div className="flex items-center justify-between px-2">
                  <span className="rounded-md bg-brand-deep px-2 py-0.5 text-[11px] font-bold text-brand-deep-foreground">RECRUITER</span>
                </div>
                <WorkspaceCard />
                <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
                <AccountMenu align="end" side="bottom" />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
      </div>
    </div>
  );
}
