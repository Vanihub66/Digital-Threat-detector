import type { ReactNode } from "react";

export function ChartTooltipBox({ title, rows }: { title: ReactNode; rows: { label: string; value: ReactNode; color?: string }[] }) {
  return (
    <div className="min-w-40 rounded-xl border border-border-strong bg-elevated/95 px-3 py-2.5 text-xs shadow-2xl backdrop-blur">
      <p className="mb-1.5 font-medium text-fg">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden />}
              {r.label}
            </span>
            <span className="font-medium tabular-nums text-fg">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
