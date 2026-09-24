import { cn } from "@/lib/utils";
import { MATCH_TIER_CLASS, MATCH_TIER_LABEL, matchTier } from "@/lib/match";

const DIM = { sm: { box: 56, r: 23, w: 5, text: "text-[15px]" }, md: { box: 72, r: 30, w: 6, text: "text-lg" }, lg: { box: 108, r: 46, w: 9, text: "text-[28px]" } };

export function MatchRing({ score, size = "sm", showLabel = false }: { score: number; size?: keyof typeof DIM; showLabel?: boolean }) {
  const d = DIM[size];
  const c = 2 * Math.PI * d.r;
  const tier = matchTier(score);
  const cls = MATCH_TIER_CLASS[tier];
  return (
    <div className="relative shrink-0" style={{ width: d.box, height: d.box }} role="img" aria-label={`${score}% match, ${MATCH_TIER_LABEL[tier]}`}>
      <svg width={d.box} height={d.box} viewBox={`0 0 ${d.box} ${d.box}`} aria-hidden>
        <circle cx={d.box / 2} cy={d.box / 2} r={d.r} fill="none" strokeWidth={d.w} className={cls.track} />
        <circle
          cx={d.box / 2} cy={d.box / 2} r={d.r} fill="none" strokeWidth={d.w} strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`} transform={`rotate(-90 ${d.box / 2} ${d.box / 2})`}
          className={cn(cls.ring, "transition-[stroke-dasharray] duration-500")}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-extrabold leading-none", d.text, cls.text)}>{score}%</span>
        {showLabel && <span className="text-xs font-semibold text-muted-foreground">match</span>}
      </span>
    </div>
  );
}
