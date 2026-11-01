import { CONFIDENCE_COPY, confidenceBand } from "@/lib/risk";
import { cn } from "@/lib/utils";

/** Ten-segment confidence indicator with a textual band so it never relies on colour alone. */
export function ConfidenceMeter({ value, className, compact }: { value: number | null; className?: string; compact?: boolean }) {
  if (value === null) {
    return <p className={cn("text-sm text-subtle", className)}>Confidence not available</p>;
  }
  const band = confidenceBand(value);
  const filled = Math.round(value * 10);
  const copy = CONFIDENCE_COPY[band];
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg">{copy.label}</span>
        <span className="text-sm tabular-nums text-muted">{Math.round(value * 100)}%</span>
      </div>
      <div
        className="mt-2 flex gap-1"
        role="meter"
        aria-label="Confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`${copy.label}, ${Math.round(value * 100)} percent`}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i < filled ? (band === "low" ? "bg-medium" : "bg-accent") : "bg-surface-2")}
          />
        ))}
      </div>
      {!compact && <p className="mt-2 text-xs text-subtle">{copy.detail}</p>}
    </div>
  );
}
