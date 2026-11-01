"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChartPie,
  Clock,
  Database,
  FileStack,
  FileText,
  Layers,
  ShieldAlert,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { ActivityChart } from "@/components/charts/activity-chart";
import { RiskDistribution } from "@/components/charts/risk-distribution";
import { PageHeader } from "@/components/layout/page-header";
import { ModuleChip, RiskBadge, SourceBadge, StatusBadge } from "@/components/risk/badges";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Notice } from "@/components/ui/notice";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { MODULES, MODULE_IDS } from "@/lib/modules";
import { riskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { isApiMode } from "@/services/analysis-service";
import { activeDraft, useAppState } from "@/store/app-store";
import { activitySeries, riskCounts } from "./stats";

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("pointer-events-none absolute inset-y-0 left-0 w-[3px]", accent)} aria-hidden />
      <CardBody className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{label}</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] tabular-nums text-fg">{value}</p>
          <p className="mt-1 text-xs text-subtle">{hint}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted [&_svg]:size-5">
          {icon}
        </span>
      </CardBody>
    </Card>
  );
}

const ENGINE_LABEL = {
  scam: "Rule-based heuristics (real, local)",
  claim: "Checkability heuristics + illustrative evidence",
  image: "Real metadata + simulated detector",
  video: "Real metadata + simulated async job",
} as const;

export function DashboardOverview() {
  const state = useAppState();
  const api = isApiMode();

  if (!state.hydrated) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const { analyses, reports } = state;
  const hasSample = analyses.some((a) => a.data_source === "sample");
  const highRisk = analyses.filter((a) => a.risk_score !== null && a.risk_score >= 60).length;
  const series = activitySeries(analyses);
  const { counts, unscored } = riskCounts(analyses);
  const recent = [...analyses].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  const draft = activeDraft(state);
  const dataHint = hasSample ? "Includes sample data" : "From this browser";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <span className="eyebrow">Digital Trust workspace</span>
            {hasSample && (
              <Badge tone="neutral">
                <Database aria-hidden /> Sample data shown
              </Badge>
            )}
          </>
        }
        title="Overview"
        description="Assess suspicious messages, claims, images and videos — and combine them into one explainable Digital Trust Report."
        actions={
          <>
            <ButtonLink href="/reports" variant="secondary">
              <FileStack /> Reports
            </ButtonLink>
            <ButtonLink href="/analyze">
              <ScanSearch /> Analyze content
            </ButtonLink>
          </>
        }
      />

      {/* Start new analysis panel */}
      <Card className="relative overflow-hidden">
        <div className="relative grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">Start a new analysis</h2>
            <p className="mt-1 text-sm text-muted">
              Pick a content type. Each completed module is added to your current draft report, so you can assess a message, its claim and
              its media together.
            </p>
            {draft ? (
              <Link
                href={`/reports/${draft.id}`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-fg hover:bg-accent/10"
              >
                <FileText className="size-4 text-accent" />
                Draft: <span className="max-w-48 truncate">{draft.title}</span>
                <span className="text-subtle">· {draft.analysis_ids.length}/4 modules</span>
                <ArrowRight className="size-4 text-subtle" />
              </Link>
            ) : (
              <p className="mt-4 text-xs text-subtle">No draft report yet — your next analysis will start one.</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODULE_IDS.map((id) => {
              const m = MODULES[id];
              const Icon = m.icon;
              return (
                <Link
                  key={id}
                  href={m.href}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-bg-2/70 p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface", m.accent)}>
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-medium text-fg">
                      {m.tab}
                      <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-subtle">{m.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </Card>

      <section aria-label="Summary statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total analyses" value={analyses.length} hint={dataHint} icon={<Activity />} accent="bg-accent" />
        <StatCard label="High-risk findings" value={highRisk} hint={`Score ≥ 60 · ${dataHint.toLowerCase()}`} icon={<ShieldAlert />} accent="bg-high" />
        <StatCard label="Reports created" value={reports.length} hint={`${reports.filter((r) => r.status === "draft").length} draft · ${dataHint.toLowerCase()}`} icon={<FileStack />} accent="bg-ai" />
        <StatCard
          label="Analysis coverage"
          value="4 / 4"
          hint={api ? "Modules routed to backend" : "Modules available in demo mode"}
          icon={<Layers />}
          accent="bg-low"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon={<Activity />}
            title="Analysis activity"
            description="Analyses per day, last 14 days"
            action={hasSample ? <Badge tone="neutral">Sample + local data</Badge> : <Badge tone="neutral">Local data</Badge>}
          />
          <CardBody>
            <ActivityChart data={series} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ChartPie />} title="Risk distribution" description="Completed analyses by risk band" />
          <CardBody>
            <RiskDistribution counts={counts} unscored={unscored} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon={<Clock />}
            title="Recent analyses"
            description="Latest results across all modules"
            action={
              <ButtonLink href="/reports" variant="ghost" size="sm">
                View all <ArrowRight />
              </ButtonLink>
            }
          />
          <CardBody className="px-2 pb-2 sm:px-3">
            {recent.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck />}
                title="No analyses yet"
                description="Run your first analysis to see results here."
                action={<ButtonLink href="/analyze">Start analysis</ButtonLink>}
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((a) => (
                  <li key={a.id}>
                    <Link href={`/results/${a.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-2 sm:px-3">
                      <ModuleChip module={a.module} withLabel={false} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{a.title}</p>
                        <p className="truncate text-xs text-subtle">
                          {MODULES[a.module].shortName} · {a.label} · {formatRelative(a.created_at)}
                        </p>
                      </div>
                      <div className="hidden shrink-0 items-center gap-2 sm:flex">
                        {a.data_source !== "api" && <SourceBadge source={a.data_source} />}
                      </div>
                      {a.status === "completed" ? (
                        <RiskBadge level={a.risk_score === null ? null : riskLevel(a.risk_score)} score={a.risk_score} />
                      ) : (
                        <StatusBadge status={a.status} />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Layers />} title="Module status" description="What each module runs right now" />
          <CardBody className="space-y-2.5">
            {MODULE_IDS.map((id) => (
              <div key={id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-2/60 p-3">
                <ModuleChip module={id} withLabel={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{MODULES[id].shortName}</p>
                  <p className="truncate text-xs text-subtle">{api ? MODULES[id].endpoint : ENGINE_LABEL[id]}</p>
                </div>
                <Badge tone={api ? "accent" : "ai"}>
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {api ? "Backend" : "Demo"}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Notice tone="privacy" title="Privacy & responsible AI">
        ThreatDetector AI reports risk indicators, confidence and limitations — never definitive proof that content is real, fake, true or false. In
        demo mode nothing is uploaded: results are produced in your browser and stored only in local storage, and raw messages and media are
        not saved. Statistics above {hasSample ? "include clearly-labelled sample records" : "reflect only this browser's records"}.{" "}
        <Link href="/settings" className="font-medium text-accent hover:underline">
          Manage data
        </Link>
      </Notice>
    </div>
  );
}
