"use client";

import { Lightbulb } from "lucide-react";

export function ExamplePicker<T extends { key: string; title: string }>({
  examples,
  onPick,
  disabled,
}: {
  examples: T[];
  onPick: (example: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-subtle">
        <Lightbulb className="size-3.5" aria-hidden /> Try an example:
      </span>
      {examples.map((ex) => (
        <button
          key={ex.key}
          type="button"
          disabled={disabled}
          onClick={() => onPick(ex)}
          className="rounded-full border border-border-strong bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-50"
        >
          {ex.title}
        </button>
      ))}
    </div>
  );
}
