import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { CheckCircle2, Minus, Sparkles } from "lucide-react";
import { ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { MatchBadge } from "@/components/brand/match-badge";
import { MatchRing } from "@/components/brand/match-ring";
import { MATCH_TIER_CLASS, matchTier } from "@/lib/match";
import { cn } from "@/lib/utils";
import type { MatchBreakdown, MatchResult, MatchTier } from "@/lib/types";

const BREAKDOWN_LABEL: Record<keyof MatchBreakdown, string> = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  preferences: "Preferences",
};

/** Literal class names so Tailwind's build-time scanner picks them up (dynamic string concatenation would not compile). */
const BAR_INDICATOR_CLASS: Record<MatchTier, string> = {
  strong: "bg-match-strong-ring",
  good: "bg-match-good-ring",
  partial: "bg-match-partial-ring",
};

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}%</span>
      </div>
      <ProgressPrimitive.Root value={value} aria-label={`${label} ${value}%`}>
        <ProgressTrack className="h-2">
          <ProgressIndicator className={BAR_INDICATOR_CLASS[matchTier(value)]} />
        </ProgressTrack>
      </ProgressPrimitive.Root>
    </div>
  );
}

export function MatchPanel({ match }: { match: MatchResult }) {
  const tier = matchTier(match.score);
  const cls = MATCH_TIER_CLASS[tier];
  const requiredCount = match.matchedSkills.length + match.missingSkills.length;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-5.5 rounded-2xl border bg-card p-7">
        <div className="flex items-center gap-5">
          <MatchRing score={match.score} size="lg" showLabel />
          <div className="flex flex-col gap-1.5">
            <MatchBadge score={match.score} />
            <span className="text-lg font-bold">
              You meet {match.matchedSkills.length} of {requiredCount} required skills
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {(Object.keys(BREAKDOWN_LABEL) as (keyof MatchBreakdown)[]).map((key) => (
            <BreakdownBar key={key} label={BREAKDOWN_LABEL[key]} value={match.breakdown[key]} />
          ))}
        </div>

        {match.strengths.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Your strengths</span>
            <ul className="flex flex-col gap-2.5">
              {match.strengths.map((s) => (
                <li key={s} className="flex gap-2.5 text-[15px] leading-snug text-foreground">
                  <span className={cn("flex size-5.5 shrink-0 items-center justify-center rounded-full", cls.soft, cls.text)}>
                    <CheckCircle2 className="size-3.5" aria-hidden />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {match.gaps.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Gaps to consider</span>
            <ul className="flex flex-col gap-2.5">
              {match.gaps.map((g) => (
                <li key={g} className="flex gap-2.5 text-[15px] leading-snug text-foreground">
                  <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-match-good-soft text-match-good">
                    <Minus className="size-3.5" aria-hidden />
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2 text-[15px] font-bold text-primary">
          <Sparkles className="size-4.5" aria-hidden />
          Why this match
        </div>
        <p className="text-[15px] leading-relaxed text-foreground">{match.explanation}</p>
        <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
          The score is calculated from your verified profile. AI only writes this explanation. Use it to help you
          decide; it is not a hiring decision.
        </p>
      </section>
    </div>
  );
}
