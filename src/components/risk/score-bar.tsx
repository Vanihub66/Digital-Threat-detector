import { RISK_META, riskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";

/** Horizontal 0–100 bar coloured by risk band, with the value printed in text. */
export function ScoreBar({ score, label, className }: { score: number | null; label: string; className?: string }) {
  const level = score === null ? null : riskLevel(score);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-valuetext={score === null ? "No score" : `${score} of 100`}
      >
        {level && (
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(3, score ?? 0)}%`, background: RISK_META[level].color }} />
        )}
      </div>
      <span className="w-8 text-right text-sm tabular-nums text-fg">{score ?? "—"}</span>
    </div>
  );
}
