"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleDashed,
  Cpu,
  FileCheck2,
  FileSearch,
  GitCompareArrows,
  ListChecks,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  Printer,
  Scale,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { PageHeader } from "@/components/layout/page-header";
import { LogoMark } from "@/components/brand/logo";
import { ModuleChip, RiskBadge, SourceBadge } from "@/components/risk/badges";
import { ConfidenceMeter } from "@/components/risk/confidence";
import { RiskGauge } from "@/components/risk/gauge";
import { ScoreBar } from "@/components/risk/score-bar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatPercent } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { RISK_META } from "@/lib/risk";
import { computeUnified } from "@/lib/unified";
import { actions, analysesForReport, useAppState } from "@/store/app-store";

function dedupe(items: string[], max: number) {
  return Array.from(new Set(items)).slice(0, max);
}

const GENERAL_LIMITATIONS = [
  "The unified score combines only modules that produced valid results; it does not cover content types that were not submitted.",
  "AI-assisted indicators can be wrong. Treat this report as decision support, not as proof that content is real, fake, true or false.",
];

export function TrustReportView({ id }: { id: string }) {
  const state = useAppState();
  const router = useRouter();
  const { toast } = useToast();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmFinal, setConfirmFinal] = useState(false);

  if (!state.hydrated) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading report">
        <Skeleton className="h-20 w-2/3" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const report = state.reports.find((r) => r.id === id);
  if (!report) {
    return (
      <Card>
        <EmptyState
          icon={<FileSearch />}
          title="Report not found"
          description="It may have been deleted or created in another browser."
          action={<ButtonLink href="/reports">Back to reports</ButtonLink>}
        />
      </Card>
    );
  }

  const analyses = analysesForReport(state, report);
  const unified = computeUnified(analyses);
  const byModule = new Map<string, AnalysisResult>(analyses.map((a) => [a.module, a]));
  const valid = unified.contributions.map((c) => byModule.get(c.module)).filter((a): a is AnalysisResult => Boolean(a));
  const recommendations = dedupe(
    [...unified.contributions].sort((a, b) => b.risk_score - a.risk_score).flatMap((c) => byModule.get(c.module)?.recommendations ?? []),
    7,
  );
  const limitations = dedupe([...GENERAL_LIMITATIONS, ...analyses.flatMap((a) => a.limitations.slice(0, 2))], 9);
  const isDraft = report.status === "draft";
  const hasDemo = analyses.some((a) => a.data_source !== "api");

  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    actions.renameReport(report.id, title);
    setRenaming(false);
  };

  const addModuleHref = (href: string) => {
    if (isDraft) actions.setActiveReport(report.id);
    router.push(href);
  };

  return (
    <div className="space-y-6">
      {/* Print-only letterhead */}
      <div className="print-only mb-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="text-lg font-semibold">ThreatDetector AI — Digital Trust Report</p>
            <p className="text-xs text-muted">
              Report {report.id} · created {formatDateTime(report.created_at)} · printed {formatDateTime(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>

      <Link href="/reports" className="no-print inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Reports history
      </Link>

      <PageHeader
        eyebrow={
          <>
            <Badge tone={isDraft ? "warning" : "success"}>
              {isDraft ? <Pencil aria-hidden /> : <Lock aria-hidden />}
              {isDraft ? "Draft" : "Final"}
            </Badge>
            <SourceBadge source={report.data_source} />
            <Badge tone="neutral">{report.id}</Badge>
          </>
        }
        title={
          renaming ? (
            <form onSubmit={submitRename} className="no-print flex max-w-xl gap-2">
              <label htmlFor="report-title" className="sr-only">
                Report title
              </label>
              <Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={100} className="text-base" />
              <Button type="submit" disabled={!title.trim()}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <span className="break-words">{report.title}</span>
          )
        }
        description={
          <>
            Digital Trust Report · created {formatDateTime(report.created_at)}
            {report.finalized_at && <> · finalised {formatDateTime(report.finalized_at)}</>}
          </>
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            {!renaming && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle(report.title);
                  setRenaming(true);
                }}
              >
                <Pencil /> Rename
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
            {isDraft && (
              <Button variant="secondary" size="sm" onClick={() => setConfirmFinal(true)} disabled={analyses.length === 0 || unified.pending.length > 0}>
                <FileCheck2 /> Finalise
              </Button>
            )}
            <Button size="sm" onClick={() => window.print()}>
              <Printer /> Print / Save as PDF
            </Button>
          </div>
        }
      />

      {hasDemo && (
        <Notice tone="demo" title="Contains demo or sample output">
          Some module results in this report were produced by ThreatDetector&apos;s labelled demo engines (rule-based or simulated), not by production AI
          models. They demonstrate the report format and must not be relied upon as real detections.
        </Notice>
      )}
      {unified.pending.length > 0 && (
        <Notice tone="info" title="Some modules are still processing" icon={<LoaderCircle className="animate-spin" />}>
          {unified.pending.map((m) => MODULES[m].shortName).join(", ")} will be added to the score automatically when finished.
        </Notice>
      )}

      {/* Overall */}
      <Card className="relative overflow-hidden">
        {unified.level && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
            style={{ background: RISK_META[unified.level].color }}
            aria-hidden
          />
        )}
        <CardBody className="relative grid grid-cols-1 gap-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex flex-col items-center gap-3">
            <RiskGauge score={unified.risk_score} size="lg" caption="Digital Trust risk" />
            <RiskBadge level={unified.level} />
          </div>
          <div className="min-w-0 space-y-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-subtle uppercase">Overall assessment</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-fg">
                {unified.level ? `${RISK_META[unified.level].label} overall risk` : "No unified score available"}
              </p>
              <p className="mt-1 text-sm text-muted">{unified.level ? RISK_META[unified.level].summary : unified.coverage_statement}</p>
            </div>
            <ConfidenceMeter value={unified.confidence} className="max-w-md" />
            <p className="rounded-xl border border-border bg-surface-2/50 p-3 text-sm text-muted">
              <ShieldCheck className="mr-1.5 inline size-4 text-accent" aria-hidden />
              {unified.coverage_statement}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-56 lg:grid-cols-1">
            <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
              <p className="text-xs text-subtle">Modules assessed</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-fg">
                {unified.contributions.length}
                <span className="text-base text-subtle"> / 4</span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
              <p className="text-xs text-subtle">Module coverage</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-fg">{formatPercent(unified.coverage_ratio)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader title="Module-wise risk breakdown" icon={<Scale />} description="Each module's score, confidence and share of the weighted mean" />
        <CardBody className="space-y-3">
          {unified.contributions.map((c) => {
            const a = byModule.get(c.module);
            return (
              <div key={c.module} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-border bg-bg-2/60 p-3.5 md:grid-cols-[200px_minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <ModuleChip module={c.module} />
                  <p className="mt-1 truncate text-xs text-subtle">{c.label}</p>
                </div>
                <ScoreBar score={c.risk_score} label={`${MODULES[c.module].shortName} risk score`} />
                <div className="flex items-center justify-between gap-3 text-xs text-muted md:justify-end">
                  <span>Conf. {formatPercent(c.confidence)}</span>
                  <span>Weight {formatPercent(c.weight)}</span>
                  {a && <span className="hidden sm:block"><SourceBadge source={a.data_source} /></span>}
                  <Link href={`/results/${c.analysis_id}`} className="no-print inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
                    Details <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}
          {unified.pending.map((m) => (
            <div key={m} className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.04] p-3.5">
              <ModuleChip module={m} />
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <LoaderCircle className="size-4 animate-spin text-accent" aria-hidden /> Processing — not yet included
              </span>
              {byModule.get(m) && (
                <Link href={`/results/${byModule.get(m)?.id}`} className="no-print ml-auto text-xs font-medium text-accent hover:underline">
                  View progress
                </Link>
              )}
            </div>
          ))}
          {unified.skipped.map((s) => {
            const a = byModule.get(s.module);
            return (
              <div key={s.module} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border-strong p-3.5">
                <ModuleChip module={s.module} />
                <span className="flex items-center gap-1.5 text-sm text-subtle">
                  <CircleDashed className="size-4" aria-hidden /> Not assessed — {s.reason}
                </span>
                <span className="ml-auto flex gap-2">
                  {a && (
                    <Link href={`/results/${a.id}`} className="no-print text-xs font-medium text-accent hover:underline">
                      View result
                    </Link>
                  )}
                  {isDraft && !a && (
                    <Button variant="ghost" size="sm" className="no-print" onClick={() => addModuleHref(MODULES[s.module].href)}>
                      <Plus /> Add {MODULES[s.module].shortName}
                    </Button>
                  )}
                </span>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Cross-modal inconsistencies" icon={<GitCompareArrows />} description="Where modules disagree or need cautious reading" />
            <CardBody>
              {unified.inconsistencies.length ? (
                <ul className="space-y-2.5">
                  {unified.inconsistencies.map((i) => (
                    <li key={i}>
                      <Notice tone="warning">{i}</Notice>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-subtle">
                  {unified.contributions.length < 2
                    ? "At least two assessed modules are needed to compare signals across content types."
                    : "No notable disagreements between modules were detected."}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Evidence & reasoning" icon={<FileSearch />} description="Key reasons reported by each assessed module" />
            <CardBody className="space-y-4">
              {valid.length === 0 && <p className="text-sm text-subtle">No assessed modules yet.</p>}
              {valid.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-bg-2/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModuleChip module={a.module} />
                    <span className="text-sm font-medium text-fg">{a.title}</span>
                  </div>
                  <ul className="mt-2.5 list-disc space-y-1 pl-5 text-sm text-muted">
                    {a.reasons.slice(0, 3).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recommended next actions" icon={<ListChecks />} />
            <CardBody>
              {recommendations.length ? (
                <ol className="space-y-3">
                  {recommendations.map((r, i) => (
                    <li key={r} className="flex gap-3 text-sm text-muted">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xs font-semibold text-accent">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{r}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-subtle">Recommendations will appear once a module is assessed.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Coverage statement" icon={<ShieldCheck />} />
            <CardBody className="space-y-3 text-sm text-muted">
              <p>{unified.coverage_statement}</p>
              <p className="rounded-xl border border-border bg-surface-2/50 p-3 text-xs">
                <span className="font-medium text-fg">Scoring method: </span>
                {unified.method}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Model versions" icon={<Cpu />} />
            <CardBody>
              {analyses.length ? (
                <dl className="space-y-2.5 text-sm">
                  {analyses.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3">
                      <dt>
                        <ModuleChip module={a.module} />
                      </dt>
                      <dd className="truncate font-mono text-xs text-fg">{a.model_version}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-subtle">No modules have run.</p>
              )}
            </CardBody>
          </Card>

          <Card className="border-medium/25">
            <CardHeader title="Limitations" icon={<TriangleAlert className="text-medium" />} />
            <CardBody>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
                {limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-1.5 text-xs text-subtle">
              <p>
                <span className="text-muted">Report ID:</span> {report.id}
              </p>
              <p>
                <span className="text-muted">Created:</span> {formatDateTime(report.created_at)}
              </p>
              <p>
                <span className="text-muted">Last updated:</span> {formatDateTime(report.updated_at)}
              </p>
              <p>
                <span className="text-muted">Status:</span> {isDraft ? "Draft — may still change" : "Final"}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <p className="border-t border-border pt-4 text-center text-xs text-subtle">
        ThreatDetector AI provides risk indicators with stated confidence and limitations. It does not determine whether content is real, fake, true or
        false. Verify important decisions through independent, trusted sources.
      </p>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this report?"
        icon={<Trash2 className="text-critical" />}
        description={`“${report.title}” and its ${analyses.length} module result(s) will be permanently removed from this browser. This cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.deleteReport(report.id);
                setConfirmDelete(false);
                toast({ tone: "success", title: "Report deleted" });
                router.push("/reports");
              }}
            >
              Delete report
            </Button>
          </>
        }
      />
      <Dialog
        open={confirmFinal}
        onClose={() => setConfirmFinal(false)}
        title="Finalise this report?"
        icon={<FileCheck2 className="text-accent" />}
        description="Finalised reports are locked: new analyses will start a fresh draft. You can still print, rename or delete it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmFinal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                actions.finalizeReport(report.id);
                setConfirmFinal(false);
                toast({ tone: "success", title: "Report finalised", description: "Use Print / Save as PDF to export it." });
              }}
            >
              Finalise report
            </Button>
          </>
        }
      />
    </div>
  );
}
