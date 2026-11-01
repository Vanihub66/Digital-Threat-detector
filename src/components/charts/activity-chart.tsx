"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipBox } from "./chart-tooltip";

export interface ActivityPoint {
  day: string;
  label: string;
  analyses: number;
  highRisk: number;
}

const SERIES = [
  { key: "analyses", label: "Analyses", color: "var(--series-1)" },
  { key: "highRisk", label: "High/critical findings", color: "var(--series-2)" },
] as const;

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4 text-xs text-muted" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-64 w-full" role="img" aria-label="Analyses per day over the last 14 days. Table view available below the chart.">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--subtle)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--subtle)", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltipBox
                    title={label}
                    rows={SERIES.map((s) => ({
                      label: s.label,
                      color: s.color,
                      value: payload.find((p) => p.dataKey === s.key)?.value ?? 0,
                    }))}
                  />
                ) : null
              }
            />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer select-none hover:text-fg">View as table</summary>
        <div className="scrollbar-thin mt-2 max-h-48 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 text-subtle">
              <tr>
                <th className="px-3 py-1.5 font-medium">Day</th>
                <th className="px-3 py-1.5 text-right font-medium">Analyses</th>
                <th className="px-3 py-1.5 text-right font-medium">High/critical</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-border">
                  <td className="px-3 py-1.5">{d.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.analyses}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.highRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
