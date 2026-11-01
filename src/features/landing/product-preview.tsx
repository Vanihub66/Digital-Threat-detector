import { FileSearch, ImageIcon, LayoutDashboard, Link2, ShieldAlert, TriangleAlert, Video } from "lucide-react";
import { RiskGauge } from "@/components/risk/gauge";
import { ScoreBar } from "@/components/risk/score-bar";
import { Badge } from "@/components/ui/badge";

const MODULE_ROWS = [
  { icon: Link2, name: "Scam & URL", score: 82, label: "Strong scam indicators", accent: "text-accent" },
  { icon: FileSearch, name: "Claim", score: 46, label: "Mixed evidence", accent: "text-accent-2" },
  { icon: ImageIcon, name: "Image", score: 23, label: "Few manipulation indicators", accent: "text-ai" },
  { icon: Video, name: "Video", score: null, label: "Insufficient face coverage", accent: "text-ai" },
];

/** Static, illustrative product preview for the landing page (not live data). */
export function ProductPreview() {
  return (
    <div className="relative pr-2 pb-2">
      <figure
        className="relative overflow-hidden rounded-lg border border-border-strong bg-surface shadow-[8px_8px_0_0_var(--border)]"
        aria-label="Illustrative preview of a ThreatDetector Digital Trust Report"
      >
        <div className="flex items-center gap-3 border-b border-border bg-bg-2 px-4 py-2.5">
          <span className="size-2 bg-accent" aria-hidden />
          <span className="truncate font-mono text-[11px] tracking-wider text-subtle uppercase">Case TR-7F3K2Q</span>
          <Badge tone="neutral" className="ml-auto">
            Illustrative preview
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[56px_minmax(0,1fr)]">
          <div className="hidden flex-col items-center gap-3 border-r border-border bg-bg-2/60 py-4 md:flex" aria-hidden>
            {[LayoutDashboard, Link2, FileSearch, ImageIcon, Video].map((I, i) => (
              <span key={i} className={`flex size-8 items-center justify-center rounded-lg ${i === 0 ? "bg-accent/10 text-accent" : "text-subtle"}`}>
                <I className="size-4" />
              </span>
            ))}
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow !text-[10px]">Digital Trust Report</p>
                <p className="mt-0.5 font-display text-base font-semibold tracking-[-0.01em] text-fg">Viral delivery-fee message</p>
              </div>
              <Badge tone="high">
                <ShieldAlert /> High · 74
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-2/60 p-3">
                <RiskGauge score={74} size="sm" caption="Overall risk" />
                <p className="mt-1 text-[11px] text-subtle">3 of 4 modules · conf. 61%</p>
              </div>
              <ul className="space-y-2.5 rounded-xl border border-border bg-bg-2/60 p-3">
                {MODULE_ROWS.map((m) => (
                  <li key={m.name} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <m.icon className={`size-3.5 ${m.accent}`} aria-hidden />
                      {m.name}
                    </span>
                    {m.score === null ? (
                      <span className="text-[11px] text-subtle">Not assessed — {m.label.toLowerCase()}</span>
                    ) : (
                      <ScoreBar score={m.score} label={`${m.name} score`} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ["Payment request via gift card", "high"],
                ["Lookalike domain: paypa1-verify.xyz", "high"],
                ["Urgency: “within 24 hours”", "medium"],
                ["Sources disagree on key figure", "medium"],
              ].map(([t, s]) => (
                <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-bg-2/60 px-3 py-2 text-xs text-muted">
                  <TriangleAlert className={`size-3.5 shrink-0 ${s === "high" ? "text-high" : "text-medium"}`} aria-hidden />
                  <span className="truncate">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}
