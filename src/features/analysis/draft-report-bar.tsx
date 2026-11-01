"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, CircleDashed, FilePlus2, FileText, LoaderCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MODULES, MODULE_IDS } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { actions, activeDraft, analysesForReport, useAppState } from "@/store/app-store";

/** Shows which modules are in the current draft report. */
export function DraftReportBar() {
  const state = useAppState();
  const [confirm, setConfirm] = useState(false);
  const draft = activeDraft(state);
  if (!state.hydrated) return null;

  if (!draft) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface/50 px-4 py-3 text-sm">
        <FileText className="size-4 text-subtle" aria-hidden />
        <span className="text-muted">Your next analysis will start a new draft Digital Trust Report.</span>
      </div>
    );
  }

  const analyses = analysesForReport(state, draft);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 md:flex-row md:items-center">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <FileText className="size-4 shrink-0 text-accent" aria-hidden />
        <span className="text-muted">Draft report:</span>
        <Link href={`/reports/${draft.id}`} className="truncate font-medium text-fg hover:text-accent">
          {draft.title}
        </Link>
      </div>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 md:ml-auto" aria-label="Modules in draft report">
        {MODULE_IDS.map((id) => {
          const a = analyses.find((x) => x.module === id);
          const running = a && (a.status === "queued" || a.status === "processing");
          const Icon = !a ? CircleDashed : running ? LoaderCircle : CircleCheck;
          return (
            <li key={id} className={cn("flex items-center gap-1 text-xs", a ? "text-fg" : "text-subtle")}>
              <Icon className={cn("size-3.5", a && !running && "text-low", running && "animate-spin text-accent")} aria-hidden />
              {MODULES[id].shortName}
              <span className="sr-only">{!a ? "not run" : running ? "processing" : "done"}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <ButtonLink href={`/reports/${draft.id}`} size="sm" variant="secondary">
          View report
        </ButtonLink>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
          <FilePlus2 /> New report
        </Button>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Start a new report?"
        description="The current draft stays in Reports History, where you can finalise it later. New analyses will go into a fresh report."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                actions.startNewReport();
                setConfirm(false);
              }}
            >
              Start new report
            </Button>
          </>
        }
      />
    </div>
  );
}
