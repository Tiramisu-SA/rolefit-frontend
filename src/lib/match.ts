import type { MatchTier } from "./types";

export function matchTier(score: number): MatchTier {
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  return "partial";
}

export const MATCH_TIER_LABEL: Record<MatchTier, string> = {
  strong: "Strong match",
  good: "Good match",
  partial: "Partial match",
};

/** Tailwind classes per tier; text + soft background + ring stroke. */
export const MATCH_TIER_CLASS: Record<MatchTier, { text: string; soft: string; ring: string; track: string }> = {
  strong: { text: "text-match-strong", soft: "bg-match-strong-soft", ring: "stroke-match-strong-ring", track: "stroke-match-strong-soft" },
  good: { text: "text-match-good", soft: "bg-match-good-soft", ring: "stroke-match-good-ring", track: "stroke-match-good-soft" },
  partial: { text: "text-match-partial", soft: "bg-match-partial-soft", ring: "stroke-match-partial-ring", track: "stroke-match-partial-soft" },
};
