"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Database, FilterX, History, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { ModuleId, RiskLevel } from "@/types/analysis";
import type { ReportStatus, TrustReport, UnifiedAssessment } from "@/types/report";
import { PageHeader } from "@/components/layout/page-header";
import { ModuleChip, RiskBadge, SourceBadge } from "@/components/risk/badges";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { EmptyState, Select, Skeleton } from "@/components/ui/misc";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import { MODULE_IDS, MODULES } from "@/lib/modules";
import { computeUnified } from "@/lib/unified";
import { cn } from "@/lib/utils";
import { actions, analysesForReport, useAppState } from "@/store/app-store";

type SortKey = "date_desc" | "date_asc" | "risk_desc" | "risk_asc";

interface Row {
  report: TrustReport;
  unified: UnifiedAssessment;
  modules: ModuleId[];
}

const DEFAULT_FILTERS = { query: "", module: "all", risk: "all", status: "all", sort: "date_desc" as SortKey };

export function ReportsHistory() {
  const state = useAppState();
  const { toast } = useToast();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<TrustReport | null>(null);
  const set = <K extends keyof typeof DEFAULT_FILTERS>(k: K, v: (typeof DEFAULT_FILTERS)[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const rows: Row[] = useMemo(
    () =>
      state.reports.map((report) => {
        const analyses = analysesForReport(state, report);
        return { report, unified: computeUnified(analyses), modules: analyses.map((a) => a.module) };
      }),
    [state],
  );

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const out = rows.filter(({ report, unified, modules }) => {
      if (q && !report.title.toLowerCase().includes(q) && !report.id.toLowerCase().includes(q)) return false;
      if (filters.module !== "all" && !modules.includes(filters.module as ModuleId)) return false;
      if (filters.status !== "all" && report.status !== (filters.status as ReportStatus)) return false;
      if (filters.risk === "unscored" && unified.level !== null) return false;
      if (filters.risk !== "all" && filters.risk !== "unscored" && unified.level !== (filters.risk as RiskLevel)) return false;
      return true;
    });
    const score = (r: Row) => r.unified.risk_score ?? -1;
    out.sort((a, b) => {
      switch (filters.sort) {
        case "date_asc":
          return a.report.created_at.localeCompare(b.report.created_at);
        case "risk_desc":
          return score(b) - score(a) || b.report.created_at.localeCompare(a.report.created_at);
        case "risk_asc":
          return score(a) - score(b) || b.report.created_at.localeCompare(a.report.created_at);
        default:
          return b.report.created_at.localeCompare(a.report.created_at);
      }
    });
    return out;
  }, [rows, filters]);

  if (!state.hydrated) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading reports">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-14 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const hasSample = state.reports.some((r) => r.data_source === "sample");
  const filtered = JSON.stringify({ ...filters, sort: "" }) !== JSON.stringify({ ...DEFAULT_FILTERS, sort: "" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports history"
        description="Search, filter and reopen Digital Trust Reports saved in this browser."
        actions={
          <ButtonLink href="/analyze">
            <Plus /> New analysis
          </ButtonLink>
        }
      />

      <Notice tone="demo" title="Stored locally in this browser" icon={<Database />}>
        Reports live in this browser&apos;s local storage — not in an account or server.{" "}
        {hasSample ? "Records marked “Sample data” were pre-loaded for demonstration. " : ""}
        Raw messages and uploaded media are never saved. Manage or reset data in{" "}
        <Link href="/settings" className="font-medium text-accent hover:underline">
          Settings
        </Link>
        .
      </Notice>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,170px))]">
          <div>
            <label htmlFor="report-search" className="mb-1.5 block text-xs font-medium text-muted">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
              <Input
                id="report-search"
                type="search"
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
                placeholder="Title or report ID…"
                className="h-10 pl-10"
              />
            </div>
          </div>
          <Select
            id="filter-module"
            label="Module"
            value={filters.module}
            onChange={(v) => set("module", v)}
            options={[{ value: "all", label: "All modules" }, ...MODULE_IDS.map((m) => ({ value: m, label: MODULES[m].shortName }))]}
          />
          <Select
            id="filter-risk"
            label="Risk level"
            value={filters.risk}
            onChange={(v) => set("risk", v)}
            options={[
              { value: "all", label: "All levels" },
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
              { value: "unscored", label: "No score" },
            ]}
          />
          <Select
            id="filter-status"
            label="Status"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "draft", label: "Draft" },
              { value: "final", label: "Final" },
            ]}
          />
          <Select
            id="sort"
            label="Sort by"
            value={filters.sort}
            onChange={(v) => set("sort", v as SortKey)}
            options={[
              { value: "date_desc", label: "Newest first" },
              { value: "date_asc", label: "Oldest first" },
              { value: "risk_desc", label: "Highest risk" },
              { value: "risk_asc", label: "Lowest risk" },
            ]}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-subtle">
          <p aria-live="polite">
            Showing {visible.length} of {rows.length} report{rows.length === 1 ? "" : "s"}
          </p>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
              <FilterX /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History />}
            title="No reports yet"
            description="Run an analysis — it will start a draft Digital Trust Report that appears here."
            action={<ButtonLink href="/analyze">Start an analysis</ButtonLink>}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search />}
            title="No reports match your filters"
            description="Try a different search term or clear the filters."
            action={
              <Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                <FilterX /> Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Digital Trust Reports</caption>
              <thead className="border-b border-border bg-surface-2/60 text-xs text-subtle">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Report</th>
                  <th scope="col" className="px-3 py-3 font-medium">Modules</th>
                  <th scope="col" className="px-3 py-3 font-medium">Overall risk</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Created</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map(({ report, unified, modules }) => (
                  <tr key={report.id} className={cn("group hover:bg-surface-2/50", state.preferences.compactTables ? "[&>td]:py-2" : "[&>td]:py-3.5")}>
                    <td className="max-w-80 px-5">
                      <Link href={`/reports/${report.id}`} className="block truncate font-medium text-fg hover:text-accent">
                        {report.title}
                      </Link>
                      <span className="flex items-center gap-2 text-xs text-subtle">
                        <code className="font-mono">{report.id}</code>
                        {report.data_source === "sample" && <SourceBadge source="sample" />}
                      </span>
                    </td>
                    <td className="px-3">
                      <div className="flex gap-1">
                        {modules.length ? modules.map((m) => <ModuleChip key={m} module={m} withLabel={false} />) : <span className="text-xs text-subtle">None</span>}
                      </div>
                    </td>
                    <td className="px-3">
                      <RiskBadge level={unified.level} score={unified.risk_score} />
                    </td>
                    <td className="px-3">
                      <StatusPill status={report.status} />
                    </td>
                    <td className="px-3 whitespace-nowrap text-muted">{formatDateTime(report.created_at)}</td>
                    <td className="px-5 text-right">
                      <div className="flex justify-end gap-1">
                        <ButtonLink href={`/reports/${report.id}`} variant="ghost" size="sm" aria-label={`Open ${report.title}`}>
                          Open <ArrowUpRight />
                        </ButtonLink>
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${report.title}`} onClick={() => setPendingDelete(report)}>
                          <Trash2 className="text-critical" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {visible.map(({ report, unified, modules }) => (
              <li key={report.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/reports/${report.id}`} className="min-w-0">
                      <p className="truncate font-medium text-fg">{report.title}</p>
                      <p className="font-mono text-xs text-subtle">{report.id}</p>
                    </Link>
                    <RiskBadge level={unified.level} score={unified.risk_score} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {modules.map((m) => (
                      <ModuleChip key={m} module={m} withLabel={false} />
                    ))}
                    <StatusPill status={report.status} />
                    {report.data_source === "sample" && <SourceBadge source="sample" />}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-subtle">{formatDateTime(report.created_at)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${report.title}`} onClick={() => setPendingDelete(report)}>
                        <Trash2 className="text-critical" />
                      </Button>
                      <ButtonLink href={`/reports/${report.id}`} variant="secondary" size="sm">
                        Open
                      </ButtonLink>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete report?"
        icon={<Trash2 className="text-critical" />}
        description={
          pendingDelete && (
            <>
              <span className="font-medium text-fg">“{pendingDelete.title}”</span> and its {pendingDelete.analysis_ids.length} module result(s) will be
              permanently removed from this browser. This cannot be undone.
            </>
          )
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!pendingDelete) return;
                actions.deleteReport(pendingDelete.id);
                toast({ tone: "success", title: "Report deleted", description: pendingDelete.title });
                setPendingDelete(null);
              }}
            >
              Delete report
            </Button>
          </>
        }
      />
    </div>
  );
}

function StatusPill({ status }: { status: ReportStatus }) {
  return status === "draft" ? (
    <Badge tone="warning">
      <Pencil aria-hidden /> Draft
    </Badge>
  ) : (
    <Badge tone="success">
      <Lock aria-hidden /> Final
    </Badge>
  );
}

