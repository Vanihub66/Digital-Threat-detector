import type { RiskLevel } from "@/types/analysis";
import { RISK_META, riskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";

const R = 80;
const CX = 100;
const CY = 96;
const ARC = Math.PI * R; // semicircle length

function polar(score: number) {
  const a = Math.PI * (1 - score / 100);
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) };
}

function arcPath(from: number, to: number) {
  const s = polar(from);
  const e = polar(to);
  return `M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y}`;
}

const BANDS: { from: number; to: number; level: RiskLevel }[] = [
  { from: 0, to: 29, level: "low" },
  { from: 30, to: 59, level: "medium" },
  { from: 60, to: 79, level: "high" },
  { from: 80, to: 100, level: "critical" },
];

/** Semicircular 0–100 risk gauge with threshold bands. */
export function RiskGauge({
  score,
  size = "md",
  caption = "Risk score",
  className,
}: {
  score: number | null;
  size?: "sm" | "md" | "lg";
  caption?: string;
  className?: string;
}) {
  const level = score === null ? null : riskLevel(score);
  const meta = level ? RISK_META[level] : null;
  const dash = score === null ? ARC : ARC * (1 - score / 100);
  const width = size === "lg" ? "w-64" : size === "sm" ? "w-36" : "w-52";
  const marker = score === null ? null : polar(score);

  return (
    <figure
      className={cn("relative mx-auto", width, className)}
      role="img"
      aria-label={score === null ? `${caption}: not available` : `${caption}: ${score} out of 100, ${meta?.label} risk`}
    >
      <svg viewBox="0 0 200 112" className="w-full overflow-visible">
        {BANDS.map((b) => (
          <path
            key={b.level}
            d={arcPath(b.from + (b.from ? 0.8 : 0), b.to + (b.to < 100 ? 0.2 : 0))}
            fill="none"
            stroke={RISK_META[b.level].color}
            strokeOpacity={0.18}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ))}
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke={meta?.color ?? "var(--border-strong)"}
          strokeWidth={10}
          strokeLinecap="butt"
          strokeDasharray={ARC}
          strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }}
          opacity={score === null ? 0.35 : 0.95}
        />
        {marker && <circle cx={marker.x} cy={marker.y} r={5} fill="var(--surface)" stroke={meta?.color} strokeWidth={3} />}
        {[0, 30, 60, 80, 100].map((t) => {
          const o = { x: CX + (R + 14) * Math.cos(Math.PI * (1 - t / 100)), y: CY - (R + 14) * Math.sin(Math.PI * (1 - t / 100)) };
          return (
            <text key={t} x={o.x} y={o.y + 3} textAnchor="middle" fontSize="8" fill="var(--subtle)" fontFamily="var(--font-mono)">
              {t}
            </text>
          );
        })}
      </svg>
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className={cn("font-display font-semibold tabular-nums tracking-[-0.03em] text-fg", size === "sm" ? "text-2xl" : size === "lg" ? "text-5xl" : "text-4xl")}>
          {score ?? "—"}
        </span>
        <span className="eyebrow !text-[10px]">{score === null ? "No score" : caption}</span>
      </figcaption>
    </figure>
  );
}
