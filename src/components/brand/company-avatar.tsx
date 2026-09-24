import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";

const SIZE = { sm: "size-10 text-sm rounded-[10px]", md: "size-13 text-base rounded-xl", lg: "size-17 text-xl rounded-2xl" };

export function CompanyAvatar({ company, size = "md", className }: { company: Company; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center font-bold text-white", SIZE[size], className)}
      style={{ backgroundColor: company.color }}
    >
      {company.initials}
    </span>
  );
}
