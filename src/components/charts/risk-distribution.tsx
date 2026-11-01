import { CircleDashed, Octagon, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import type { RiskLevel } from "@/types/analysis";
import { RISK_LEVELS, RISK_META, RISK_THRESHOLDS } from "@/lib/risk";

const ICONS = { low: ShieldCheck, medium: TriangleAlert, high: ShieldAlert, critical: Octagon } as const;

/** Horizontal bars per risk band — label, icon and count accompany every colour. */
export function RiskDistribution({ counts, unscored }: { counts: Record<RiskLevel, number>; unscored: number }) {
  const total = RISK_LEVELS.reduce((s, l) => s + counts[l], 0) + unscored;
  const max = Math.max(1, ...RISK_LEVELS.map((l) => counts[l]), unscored);
  return (
    <ul className="space-y-3.5">
      {RISK_LEVELS.map((level) => {
        const Icon = ICONS[level];
        const n = counts[level];
        return (
          <li key={level} className="group">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-fg">
                <Icon className="size-4" style={{ color: RISK_META[level].color }} aria-hidden />
                {RISK_META[level].label}
                <span className="text-xs text-subtle">
                  {RISK_THRESHOLDS[level].min}–{RISK_THRESHOLDS[level].max}
                </span>
              </span>
              <span className="tabular-nums text-muted">
                {n}
                <span className="ml-1 text-xs text-subtle">({total ? Math.round((n / total) * 100) : 0}%)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${(n / max) * 100}%`, background: RISK_META[level].color }}
                title={`${RISK_META[level].label}: ${n}`}
              />
            </div>
          </li>
        );
      })}
      <li>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-fg">
            <CircleDashed className="size-4 text-subtle" aria-hidden />
            No score
            <span className="text-xs text-subtle">failed / insufficient / unscored</span>
          </span>
          <span className="tabular-nums text-muted">{unscored}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-border-strong" style={{ width: `${(unscored / max) * 100}%` }} />
        </div>
      </li>
    </ul>
  );
}
