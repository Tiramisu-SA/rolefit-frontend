"use client";

import { Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const OPTIONS: { role: Role; label: string; icon: typeof User }[] = [
  { role: "seeker", label: "Job Seeker", icon: User },
  { role: "recruiter", label: "Recruiter", icon: Briefcase },
];

export function RoleSwitch({ value, onChange, className }: { value: Role; onChange: (role: Role) => void; className?: string }) {
  return (
    <div role="tablist" aria-label="Account type" className={cn("grid grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1.5", className)}>
      {OPTIONS.map(({ role, label, icon: Icon }) => {
        const selected = value === role;
        return (
          <button
            key={role}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(role)}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
              selected ? "bg-card text-primary-soft-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
