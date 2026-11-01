"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy, FileText, Plus } from "lucide-react";
import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { PageHeader } from "@/components/layout/page-header";
import { ModuleChip, SourceBadge, StatusBadge } from "@/components/risk/badges";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { findReportForAnalysis, useAppState } from "@/store/app-store";

export function ResultHeader({ result }: { result: AnalysisResult }) {
  const state = useAppState();
  const report = findReportForAnalysis(state, result.id);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <Link href={report ? `/reports/${report.id}` : "/reports"} className="no-print inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> {report ? "Back to report" : "Reports history"}
      </Link>
      <PageHeader
        eyebrow={
          <>
            <ModuleChip module={result.module} />
            <StatusBadge status={result.status} />
            <SourceBadge source={result.data_source} />
          </>
        }
        title={<span className="break-words">{result.title}</span>}
        description={
          <>
            {MODULES[result.module].name} · {result.input_summary ? `${result.input_summary} · ` : ""}
            {formatDateTime(result.created_at)}
          </>
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  setCopied(false);
                }
              }}
              aria-label="Copy analysis ID"
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : result.id}
            </Button>
            <ButtonLink href={MODULES[result.module].href} variant="secondary" size="sm">
              <Plus /> New {MODULES[result.module].shortName.toLowerCase()} analysis
            </ButtonLink>
            {report && (
              <ButtonLink href={`/reports/${report.id}`} size="sm">
                <FileText /> {report.status === "draft" ? "Open draft report" : "View report"}
              </ButtonLink>
            )}
          </div>
        }
      />
    </div>
  );
}
