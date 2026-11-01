import type { ReactNode } from "react";
import { CircleCheck, CircleMinus, Cpu, Info, ListChecks, ShieldQuestion, TriangleAlert } from "lucide-react";
import type { AnalysisResult, EvidenceItem } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { ConfidenceMeter } from "@/components/risk/confidence";
import { RiskGauge } from "@/components/risk/gauge";
import { RiskBadge, SourceBadge } from "@/components/risk/badges";
import { formatDateTime, formatPercent } from "@/lib/format";
import { RISK_META, riskLevel, SEVERITY_META } from "@/lib/risk";
import { cn } from "@/lib/utils";

/** Banner explaining where the result came from. */
export function DataSourceNotice({ result }: { result: AnalysisResult }) {
  if (result.data_source === "api") return null;
  return (
    <Notice tone="demo" title={result.data_source === "sample" ? "Sample record" : "Demo output — not a production AI detection"}>
      {result.data_source === "sample"
        ? "This record was pre-loaded so the interface has something to show. It was produced by the same labelled demo engines."
        : "This result was produced in your browser by ThreatDetector's demo engines. Parts marked “simulated” are placeholders until the AI backend is connected."}
    </Notice>
  );
}

export function SummaryCard({ result, caption, extra }: { result: AnalysisResult; caption?: string; extra?: ReactNode }) {
  const level = result.risk_score === null ? null : riskLevel(result.risk_score);
  return (
    <Card className="relative overflow-hidden">
      {level && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
          style={{ background: RISK_META[level].color }}
          aria-hidden
        />
      )}
      <CardBody className="relative grid grid-cols-1 gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <div className="flex flex-col items-center gap-3">
          <RiskGauge score={result.risk_score} caption={caption ?? "Risk score"} />
          <RiskBadge level={level} />
        </div>
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-subtle uppercase">Assessment</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-fg">{result.label}</p>
            <p className="mt-1 text-sm text-muted">{level ? RISK_META[level].summary : "No risk score was produced for this analysis. See the reasons below."}</p>
          </div>
          <ConfidenceMeter value={result.confidence} className="max-w-md" />
          {extra}
        </div>
      </CardBody>
    </Card>
  );
}

export function BulletCard({
  title,
  items,
  icon,
  tone = "accent",
  empty = "Nothing to show.",
  description,
}: {
  title: string;
  items: string[];
  icon?: ReactNode;
  tone?: "accent" | "warning" | "success";
  empty?: string;
  description?: string;
}) {
  const bullet = tone === "warning" ? "text-medium" : tone === "success" ? "text-low" : "text-accent";
  const Icon = tone === "warning" ? CircleMinus : CircleCheck;
  return (
    <Card>
      <CardHeader title={title} icon={icon} description={description} />
      <CardBody>
        {items.length === 0 ? (
          <p className="text-sm text-subtle">{empty}</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted">
                <Icon className={cn("mt-0.5 size-4 shrink-0", bullet)} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export function RecommendationsCard({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader title="Recommended next steps" icon={<ListChecks />} />
      <CardBody>
        <ol className="space-y-3">
          {items.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <span className="pt-0.5">{r}</span>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export function LimitationsCard({ items }: { items: string[] }) {
  return (
    <Card className="border-medium/25">
      <CardHeader title="Limitations & uncertainty" icon={<TriangleAlert className="text-medium" />} />
      <CardBody>
        <ul className="space-y-2.5">
          {items.map((l, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted">
              <Info className="mt-0.5 size-4 shrink-0 text-medium" aria-hidden />
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-border pt-4 text-xs text-subtle">
          ThreatDetector reports indicators and likelihoods. It does not prove that content is real, fake, true or false.
        </p>
      </CardBody>
    </Card>
  );
}

export function CoverageCard({ result }: { result: AnalysisResult }) {
  const { coverage } = result;
  return (
    <Card>
      <CardHeader
        title="Analysis coverage"
        icon={<ShieldQuestion />}
        action={<Badge tone="neutral">{formatPercent(coverage.ratio)} of planned checks</Badge>}
      />
      <CardBody className="space-y-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${coverage.ratio * 100}%` }} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-subtle uppercase">Assessed</p>
            <ul className="space-y-1.5">
              {coverage.assessed.length === 0 && <li className="text-sm text-subtle">Nothing yet</li>}
              {coverage.assessed.map((a) => (
                <li key={a} className="flex gap-2 text-sm text-fg">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-low" aria-hidden /> {a}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-subtle uppercase">Not assessed</p>
            <ul className="space-y-1.5">
              {coverage.not_assessed.map((a) => (
                <li key={a} className="flex gap-2 text-sm text-muted">
                  <CircleMinus className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden /> {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {coverage.note && <p className="text-xs text-subtle">{coverage.note}</p>}
      </CardBody>
    </Card>
  );
}

export function ModelInfoCard({ result }: { result: AnalysisResult }) {
  const rows: [string, ReactNode][] = [
    ["Model / engine", <code key="m" className="font-mono text-xs">{result.model_version}</code>],
    ["Data source", <SourceBadge key="s" source={result.data_source} />],
    ["Analysis ID", <code key="i" className="font-mono text-xs">{result.id}</code>],
    ["Created", formatDateTime(result.created_at)],
    ["Completed", formatDateTime(result.completed_at)],
  ];
  return (
    <Card>
      <CardHeader title="Model & provenance" icon={<Cpu />} />
      <CardBody>
        <dl className="space-y-2.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <dt className="text-subtle">{k}</dt>
              <dd className="text-right text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

export function SignalList({ items, empty }: { items: EvidenceItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-subtle">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((e) => {
        const sev = SEVERITY_META[e.severity];
        return (
          <li key={e.id} className="rounded-xl border border-border bg-bg-2/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-fg">{e.title}</p>
              <Badge className={cn(sev.bg, sev.text, sev.border)}>{sev.label} weight</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{e.detail}</p>
            {e.snippet && (
              <p className="mt-2 inline-block rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg">“{e.snippet}”</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
