"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FrameResult } from "@/types/analysis";
import { RISK_META, riskLevel } from "@/lib/risk";
import { ChartTooltipBox } from "./chart-tooltip";

/** Per-frame simulated/real manipulation scores. Frames without a face show a short grey stub. */
export function FrameChart({ frames, planned }: { frames: FrameResult[]; planned: number }) {
  const data = Array.from({ length: Math.max(planned, frames.length) }, (_, i) => {
    const f = frames[i];
    return {
      i,
      t: f ? `${f.t}s` : "",
      value: f ? (f.face && f.score !== null ? f.score : 3) : 0,
      score: f?.score ?? null,
      face: f?.face ?? null,
      pending: !f,
    };
  });

  return (
    <div>
      <div className="h-56 w-full" role="img" aria-label={`Per-frame scores for ${frames.length} sampled frames. Threshold for high risk at 60.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: "var(--subtle)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis domain={[0, 100]} ticks={[0, 30, 60, 80, 100]} tick={{ fill: "var(--subtle)", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
            <ReferenceLine y={60} stroke="var(--high)" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !p || p.pending) return null;
                return (
                  <ChartTooltipBox
                    title={`Frame ${p.i + 1} · ${p.t}`}
                    rows={[
                      { label: "Face detected", value: p.face ? "Yes" : "No" },
                      { label: "Score", value: p.score ?? "—", color: p.score !== null ? RISK_META[riskLevel(p.score)].color : undefined },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.i}
                  fill={d.pending ? "transparent" : d.score === null ? "var(--border-strong)" : RISK_META[riskLevel(d.score)].color}
                  fillOpacity={d.score === null ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
        {(["low", "medium", "high", "critical"] as const).map((l) => (
          <li key={l} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: RISK_META[l].color }} aria-hidden /> {RISK_META[l].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-border-strong" aria-hidden /> No face
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0 w-3 border-t border-dashed border-high" aria-hidden /> High-risk threshold (60)
        </li>
      </ul>
    </div>
  );
}
