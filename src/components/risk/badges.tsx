import { CircleAlert, CircleCheck, CircleDashed, FlaskConical, LoaderCircle, Octagon, ServerCog, ShieldAlert, ShieldCheck, TriangleAlert, Database } from "lucide-react";
import type { AnalysisStatus, DataSource, ModuleId, RiskLevel } from "@/types/analysis";
import { Badge, type Tone } from "@/components/ui/badge";
import { RISK_META } from "@/lib/risk";
import { MODULES, STATUS_META } from "@/lib/modules";
import { cn } from "@/lib/utils";

const RISK_TONE: Record<RiskLevel, Tone> = { low: "success", medium: "warning", high: "high", critical: "danger" };
const RISK_ICON = { low: ShieldCheck, medium: TriangleAlert, high: ShieldAlert, critical: Octagon } as const;

export function RiskBadge({ level, score, className }: { level: RiskLevel | null; score?: number | null; className?: string }) {
  if (!level) {
    return (
      <Badge tone="neutral" className={className}>
        <CircleDashed aria-hidden /> No score
      </Badge>
    );
  }
  const Icon = RISK_ICON[level];
  return (
    <Badge tone={RISK_TONE[level]} className={className}>
      <Icon aria-hidden />
      {RISK_META[level].label}
      {score != null && <span className="tabular-nums opacity-80">· {score}</span>}
    </Badge>
  );
}

const STATUS_ICON: Record<AnalysisStatus, typeof CircleCheck> = {
  queued: CircleDashed,
  processing: LoaderCircle,
  completed: CircleCheck,
  failed: CircleAlert,
  insufficient_coverage: TriangleAlert,
};

const STATUS_TONE: Record<string, Tone> = { neutral: "neutral", info: "info", success: "success", danger: "danger", warning: "warning" };

export function StatusBadge({ status }: { status: AnalysisStatus }) {
  const meta = STATUS_META[status];
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[meta.tone]}>
      <Icon aria-hidden className={cn(status === "processing" && "animate-spin")} />
      {meta.label}
    </Badge>
  );
}

export function SourceBadge({ source, className }: { source: DataSource; className?: string }) {
  if (source === "api")
    return (
      <Badge tone="accent" className={className}>
        <ServerCog aria-hidden /> Backend result
      </Badge>
    );
  if (source === "sample")
    return (
      <Badge tone="neutral" className={className}>
        <Database aria-hidden /> Sample data
      </Badge>
    );
  return (
    <Badge tone="ai" className={className}>
      <FlaskConical aria-hidden /> Demo output
    </Badge>
  );
}

export function ModuleChip({ module, className, withLabel = true }: { module: ModuleId; className?: string; withLabel?: boolean }) {
  const m = MODULES[module];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)} title={m.name}>
      <span className={cn("flex size-6 items-center justify-center rounded-md border border-border bg-surface-2", m.accent)}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      {withLabel ? m.shortName : <span className="sr-only">{m.shortName}</span>}
    </span>
  );
}
