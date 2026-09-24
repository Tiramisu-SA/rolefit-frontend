"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/login?role=seeker", label: "Find jobs" },
  { href: "#how", label: "How it works" },
  { href: "#recruiters", label: "For recruiters" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-18 items-center justify-between border-b bg-card px-4 sm:px-6 lg:px-20">
      <div className="flex items-center gap-12">
        <Logo />
        <nav className="hidden items-center gap-8 text-[15px] font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-foreground/80 hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <ThemeToggle />
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "hidden sm:inline-flex")}
        >
          Sign in
        </Link>
        <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "hidden sm:inline-flex")}>
          Get started
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Open menu"
            className="md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
          <SheetContent side="right" className="w-full max-w-xs gap-0">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4 py-2 text-base font-medium">
              {NAV_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  render={
                    <Link
                      href={link.href}
                      className="flex h-11 items-center rounded-lg px-3 text-foreground/80 hover:bg-muted hover:text-foreground"
                    />
                  }
                >
                  {link.label}
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t p-4">
              <SheetClose
                render={<Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })} />}
              >
                Sign in
              </SheetClose>
              <SheetClose render={<Link href="/register" className={buttonVariants({ size: "lg" })} />}>
                Get started
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
