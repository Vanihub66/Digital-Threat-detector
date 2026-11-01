"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CircleCheck, CircleMinus, Server } from "lucide-react";
import type { ModuleId } from "@/types/analysis";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULES, MODULE_IDS } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { isApiMode } from "@/services/analysis-service";
import { ClaimForm } from "./claim-form";
import { DraftReportBar } from "./draft-report-bar";
import { ImageForm } from "./image-form";
import { MODULE_GUIDE } from "./module-guide";
import { TextUrlForm } from "./text-url-form";
import { VideoForm } from "./video-form";

const FORMS: Record<ModuleId, () => React.JSX.Element> = {
  scam: TextUrlForm,
  claim: ClaimForm,
  image: ImageForm,
  video: VideoForm,
};

/**
 * Unified analysis workspace. On module routes (/analyze/scam etc.) switching tabs
 * updates the URL in place so the sidebar stays in sync while form state is kept.
 */
export function AnalysisWorkspace({ initialModule = "scam", syncUrl = false }: { initialModule?: ModuleId; syncUrl?: boolean }) {
  const [selected, setSelected] = useState<ModuleId>(initialModule);
  const tabRefs = useRef<Record<ModuleId, HTMLButtonElement | null>>({ scam: null, claim: null, image: null, video: null });
  const api = isApiMode();

  const select = (m: ModuleId, focus = false) => {
    setSelected(m);
    if (syncUrl) window.history.replaceState(null, "", MODULES[m].href);
    if (focus) tabRefs.current[m]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const i = MODULE_IDS.indexOf(selected);
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? MODULE_IDS[(i + 1) % MODULE_IDS.length]
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? MODULE_IDS[(i - 1 + MODULE_IDS.length) % MODULE_IDS.length]
          : e.key === "Home"
            ? MODULE_IDS[0]
            : e.key === "End"
              ? MODULE_IDS[MODULE_IDS.length - 1]
              : null;
    if (next) {
      e.preventDefault();
      select(next, true);
    }
  };

  const meta = MODULES[selected];
  const guide = MODULE_GUIDE[selected];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={api ? <Badge tone="accent">API mode</Badge> : <Badge tone="ai">Demo mode · labelled outputs</Badge>}
        title={syncUrl ? meta.name : "New analysis"}
        description={
          syncUrl
            ? meta.description
            : "Choose what to analyse. Every completed module is added to your draft Digital Trust Report."
        }
      />

      <DraftReportBar />

      <div role="tablist" aria-label="Content type" className="grid grid-cols-2 gap-3 lg:grid-cols-4" onKeyDown={onKeyDown}>
        {MODULE_IDS.map((id) => {
          const m = MODULES[id];
          const Icon = m.icon;
          const active = id === selected;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              id={`tab-${id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(id)}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-xl border p-3.5 text-left transition-all sm:p-4",
                active
                  ? "border-accent/50 bg-accent/[0.07] shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
                  : "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  active ? "border-accent/40 bg-accent/15 text-accent" : cn("border-border bg-surface-2", m.accent),
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{m.tab}</span>
                <span className="hidden truncate text-xs text-subtle sm:block">{m.shortName} module</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          {MODULE_IDS.map((id) => {
            const Form = FORMS[id];
            const PanelIcon = MODULES[id].icon;
            return (
              <div key={id} id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={id !== selected}>
                <CardHeader title={MODULES[id].name} description={MODULES[id].description} icon={<PanelIcon className={MODULES[id].accent} />} />
                <CardBody>
                  <Form />
                </CardBody>
              </div>
            );
          })}
        </Card>

        <aside className="space-y-4" aria-label="About this module">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-fg">What this module checks</h3>
                <ul className="mt-2.5 space-y-2">
                  {guide.checks.map((c) => (
                    <li key={c} className="flex gap-2 text-sm text-muted">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-fg">Known limits</h3>
                <ul className="mt-2.5 space-y-2">
                  {guide.limits.map((c) => (
                    <li key={c} className="flex gap-2 text-sm text-muted">
                      <CircleMinus className="mt-0.5 size-4 shrink-0 text-medium" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-4">
                <p className="flex items-center gap-1.5 text-xs text-subtle">
                  <Server className="size-3.5" aria-hidden /> Proposed endpoint
                </p>
                <code className="mt-1 block rounded-lg bg-bg-2 px-2.5 py-1.5 font-mono text-xs text-muted">{meta.endpoint}</code>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
