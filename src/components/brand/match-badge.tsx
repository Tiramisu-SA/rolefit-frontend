import { cn } from "@/lib/utils";
import { MATCH_TIER_CLASS, MATCH_TIER_LABEL, matchTier } from "@/lib/match";

export function MatchBadge({ score, className }: { score: number; className?: string }) {
  const tier = matchTier(score);
  const cls = MATCH_TIER_CLASS[tier];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", cls.soft, cls.text, className)}>
      {MATCH_TIER_LABEL[tier]}
    </span>
  );
}
