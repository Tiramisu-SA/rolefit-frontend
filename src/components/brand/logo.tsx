import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", inverted = false, className }: { href?: string; inverted?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", inverted ? "text-white" : "text-foreground", className)}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          inverted ? "bg-white text-primary" : "bg-primary text-primary-foreground"
        )}
      >
        <Check className="size-4.5" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="text-xl font-extrabold tracking-tight">RoleFit</span>
    </Link>
  );
}
