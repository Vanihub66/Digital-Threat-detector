"use client";

import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";

export function RunProgress({ stage, progress, stages, onCancel }: { stage: string; progress: number; stages: readonly string[]; onCancel: () => void }) {
  const current = stages.indexOf(stage);
  return (
    <div className="animate-fade-up rounded-xl border border-accent/25 bg-accent/[0.04] p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-fg">
          <LoaderCircle className="size-4 animate-spin text-accent" aria-hidden />
          {stage || "Starting"}…
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X /> Cancel
        </Button>
      </div>
      <ProgressBar value={Math.max(0.05, progress)} label="Analysis progress" className="mt-3" />
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {stages.map((s, i) => (
          <li key={s} className={i < current ? "text-low" : i === current ? "text-accent" : "text-subtle"}>
            {i < current ? "✓ " : `${i + 1}. `}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
