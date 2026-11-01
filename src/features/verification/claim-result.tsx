"use client";

import { BookOpenCheck, ExternalLink, FileQuestion, Quote, Scale, Split, TriangleAlert } from "lucide-react";
import type { ClaimAnalysis, ClaimVerdict } from "@/types/analysis";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Notice } from "@/components/ui/notice";
import { ConfidenceMeter } from "@/components/risk/confidence";
import { RiskGauge } from "@/components/risk/gauge";
import { CoverageCard, DataSourceNotice, LimitationsCard, ModelInfoCard, RecommendationsCard } from "@/components/results/result-blocks";
import { formatPercent } from "@/lib/format";
import { SourceCard, STANCE_META } from "./source-card";

export const VERDICT_META: Record<ClaimVerdict, { tone: Tone; description: string }> = {
  supports: { tone: "success", description: "The reviewed evidence largely supports the claim as stated." },
  contradicts: { tone: "danger", description: "The reviewed evidence largely contradicts the claim as stated." },
  mixed: { tone: "warning", description: "Reviewed sources disagree, or support only part of the claim." },
  insufficient: { tone: "neutral", description: "There was not enough reliable evidence to assess the claim either way." },
  needs_clarification: { tone: "info", description: "The claim is too vague or subjective to check. Rephrase it more specifically." },
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-fg">{value}</p>
      {hint && <p className="text-[11px] text-subtle">{hint}</p>}
    </div>
  );
}

export function ClaimResult({ result }: { result: ClaimAnalysis }) {
  const d = result.details;
  const verdict = VERDICT_META[d.verdict];
  const counts = {
    supports: d.sources.filter((s) => s.stance === "supports").length,
    contradicts: d.sources.filter((s) => s.stance === "contradicts").length,
    neutral: d.sources.filter((s) => s.stance === "neutral").length,
  };
  const total = d.sources.length;

  return (
    <div className="space-y-6">
      <DataSourceNotice result={result} />

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-accent-2" aria-hidden />
        <CardBody className="relative grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-subtle uppercase">
              <Quote className="size-3.5" aria-hidden /> Claim under review
            </p>
            <blockquote className="mt-2 border-l-2 border-accent-2/60 pl-4 text-lg leading-snug font-medium text-fg sm:text-xl">
              {d.claim}
            </blockquote>
            {(d.context.date || d.context.location || d.context.entities || d.context.notes) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {d.context.date && <Badge tone="neutral">Date: {d.context.date}</Badge>}
                {d.context.location && <Badge tone="neutral">Location: {d.context.location}</Badge>}
                {d.context.entities && <Badge tone="neutral">Entities: {d.context.entities}</Badge>}
                {d.context.notes && <Badge tone="neutral">Seen: {d.context.notes}</Badge>}
              </div>
            )}
            <div className="mt-5">
              <p className="text-xs font-medium tracking-wide text-subtle uppercase">Evidence assessment</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Badge tone={verdict.tone} className="px-3 py-1 text-sm">
                  <Scale aria-hidden className="!size-4" /> {result.label}
                </Badge>
              </div>
              <p className="mt-2 max-w-xl text-sm text-muted">{verdict.description}</p>
              <p className="mt-1 text-xs text-subtle">This describes the evidence reviewed — it is not a ruling that the claim is true or false.</p>
            </div>
            <ConfidenceMeter value={result.confidence} className="mt-5 max-w-md" />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 lg:border-l lg:border-border lg:pl-6">
            <RiskGauge score={result.risk_score} caption="Misinfo. risk" size="sm" />
            <p className="max-w-40 text-center text-[11px] text-subtle">Risk that sharing this claim spreads misinformation</p>
          </div>
        </CardBody>
      </Card>

      <section aria-label="Evidence metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Evidence coverage" value={formatPercent(d.evidence_coverage)} hint="Checkable parts covered" />
        <Metric label="Source diversity" value={d.source_diversity === null ? "—" : formatPercent(d.source_diversity)} hint={`${new Set(d.sources.map((s) => s.publisher)).size} publishers`} />
        <Metric label="Recency" value={d.recency ? "Dated" : "—"} hint={d.recency ?? "No dated sources"} />
        <Metric label="Checkability" value={formatPercent(d.checkability.score)} hint="Specific & verifiable" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Evidence review"
              icon={<BookOpenCheck />}
              description={
                d.retrieval === "illustrative"
                  ? "Illustrative example sources bundled with the demo — not retrieved"
                  : d.retrieval === "live"
                    ? "Sources retrieved by the verification backend"
                    : "No sources were retrieved"
              }
              action={d.retrieval === "illustrative" ? <Badge tone="ai">Illustrative</Badge> : null}
            />
            <CardBody className="space-y-5">
              {total > 0 ? (
                <>
                  <div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${counts.supports} supporting, ${counts.contradicts} contradicting, ${counts.neutral} neutral sources`}>
                      {(["supports", "contradicts", "neutral"] as const).map((k) =>
                        counts[k] ? (
                          <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: STANCE_META[k].color }} className="h-full border-r-2 border-surface last:border-r-0" />
                        ) : null,
                      )}
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                      {(["supports", "contradicts", "neutral"] as const).map((k) => (
                        <li key={k} className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: STANCE_META[k].color }} aria-hidden />
                          {STANCE_META[k].label}: <span className="font-medium text-fg">{counts[k]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {d.sources.map((s) => (
                      <SourceCard key={s.id} source={s} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<FileQuestion />}
                  title={d.verdict === "needs_clarification" ? "Claim needs to be more specific" : "No evidence reviewed"}
                  description={
                    d.verdict === "needs_clarification"
                      ? "Evidence search was skipped because the claim is too vague to match reliably."
                      : "Demo mode does not search the web. Connect the verification backend, or use the verification steps to check manually."
                  }
                  className="py-8"
                />
              )}
            </CardBody>
          </Card>

          {d.conflicts.length > 0 && (
            <Card className="border-medium/25">
              <CardHeader title="Conflicting evidence" icon={<Split className="text-medium" />} />
              <CardBody>
                <ul className="space-y-2.5">
                  {d.conflicts.map((c) => (
                    <li key={c} className="text-sm text-muted">
                      {c}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Missing evidence & ambiguity" icon={<TriangleAlert className="text-medium" />} />
            <CardBody className="space-y-3">
              {d.missing_evidence.map((m) => (
                <Notice key={m} tone="warning">
                  {m}
                </Notice>
              ))}
              {d.checkability.issues.map((m) => (
                <Notice key={m} tone="info" title="Ambiguity">
                  {m}
                </Notice>
              ))}
              {d.missing_evidence.length === 0 && d.checkability.issues.length === 0 && (
                <p className="text-sm text-subtle">No major gaps or ambiguities were flagged.</p>
              )}
              {d.checkability.strengths.length > 0 && (
                <div className="rounded-xl border border-border bg-surface-2/40 p-3.5">
                  <p className="text-xs font-medium tracking-wide text-subtle uppercase">What makes it checkable</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted">
                    {d.checkability.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Suggested verification steps" icon={<BookOpenCheck />} description="External links open real search tools in a new tab" />
            <CardBody>
              <ol className="space-y-3">
                {d.verification_steps.map((s, i) => (
                  <li key={s.label} className="flex gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent-2/30 bg-accent-2/10 text-xs font-semibold text-accent-2">
                      {i + 1}
                    </span>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="pt-0.5 text-fg hover:text-accent">
                        {s.label} <ExternalLink className="inline size-3.5 text-subtle" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="pt-0.5 text-muted">{s.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Why this assessment" icon={<Scale />} />
            <CardBody>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
                {result.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <RecommendationsCard items={result.recommendations} />
          <CoverageCard result={result} />
          <ModelInfoCard result={result} />
          <LimitationsCard items={result.limitations} />
        </div>
      </div>
    </div>
  );
}
