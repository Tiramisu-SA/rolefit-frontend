"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { RoleProvider } from "@/lib/auth/role-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <RoleProvider>
        {children}
        <Toaster richColors position="top-right" />
      </RoleProvider>
    </ThemeProvider>
  );
}
