import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "accent" | "ai" | "info" | "success" | "warning" | "high" | "danger";

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border-strong",
  accent: "bg-accent/10 text-accent border-accent/25",
  ai: "bg-ai/10 text-ai border-ai/25",
  info: "bg-info/10 text-info border-info/25",
  success: "bg-low/10 text-low border-low/25",
  warning: "bg-medium/10 text-medium border-medium/25",
  high: "bg-high/10 text-high border-high/25",
  danger: "bg-critical/10 text-critical border-critical/25",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap [&_svg]:size-3",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
