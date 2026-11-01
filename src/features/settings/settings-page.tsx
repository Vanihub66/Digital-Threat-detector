"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  Brain,
  CircleCheck,
  CircleUserRound,
  CircleX,
  Database,
  Download,
  HardDrive,
  MessageSquareText,
  Monitor,
  Moon,
  Palette,
  PlugZap,
  RotateCcw,
  Scale,
  Send,
  ServerCog,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Label, Textarea } from "@/components/ui/field";
import { Select, Skeleton, Switch } from "@/components/ui/misc";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { CLAIM_MODEL_VERSION } from "@/lib/demo/claim-engine";
import { IMAGE_MODEL_VERSION } from "@/lib/demo/image-engine";
import { SCAM_MODEL_VERSION } from "@/lib/demo/scam-engine";
import { VIDEO_MODEL_VERSION } from "@/lib/demo/video-engine";
import { formatBytes } from "@/lib/format";
import { MODULES, MODULE_IDS } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { API_CONFIG } from "@/services/api/config";
import { ApiError } from "@/services/api/client";
import { threatDetectorApi } from "@/services/api/endpoints";
import { actions, useAppState, type ThemePreference } from "@/store/app-store";
import { useLocalFeedback } from "./use-local-feedback";

const ENGINES = {
  scam: { version: SCAM_MODEL_VERSION, kind: "Rule-based heuristics", note: "Real local pattern matching; no ML model, no reputation lookups." },
  claim: { version: CLAIM_MODEL_VERSION, kind: "Checkability heuristics", note: "No evidence retrieval; example claims use illustrative sources." },
  image: { version: IMAGE_MODEL_VERSION, kind: "Simulated detector", note: "Real metadata & quality; detector signals are deterministic placeholders." },
  video: { version: VIDEO_MODEL_VERSION, kind: "Simulated async job", note: "Real duration & sampling plan; faces and frame scores are simulated." },
} as const;

function Section({ id, title, description, icon, children, action }: { id?: string; title: string; description?: string; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader title={title} description={description} icon={icon} action={action} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function ThemePicker({ value }: { value: ThemePreference }) {
  const opts: { v: ThemePreference; label: string; icon: ReactNode }[] = [
    { v: "dark", label: "Midnight", icon: <Moon /> },
    { v: "light", label: "Light", icon: <Sun /> },
    { v: "system", label: "System", icon: <Monitor /> },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => actions.setPreferences({ theme: o.v })}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border p-3 text-sm transition-colors [&_svg]:size-4",
            value === o.v ? "border-accent/50 bg-accent/10 text-fg" : "border-border text-muted hover:border-border-strong hover:text-fg",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function storageSize(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("threatdetector")) total += (localStorage.getItem(k)?.length ?? 0) * 2;
    }
    return total;
  } catch {
    return 0;
  }
}

function ConnectionTest() {
  const [state, setState] = useState<{ status: "idle" | "testing" | "ok" | "error"; message?: string }>({ status: "idle" });
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-2/60 p-3">
          <dt className="text-xs text-subtle">Mode</dt>
          <dd className="mt-1 font-medium text-fg">{API_CONFIG.mode === "api" ? "API (backend)" : "Demo (local engines)"}</dd>
        </div>
        <div className="rounded-xl border border-border bg-bg-2/60 p-3">
          <dt className="text-xs text-subtle">API base URL</dt>
          <dd className="mt-1 truncate font-mono text-xs text-fg">{API_CONFIG.baseUrl}</dd>
        </div>
        <div className="rounded-xl border border-border bg-bg-2/60 p-3">
          <dt className="text-xs text-subtle">Request timeout</dt>
          <dd className="mt-1 font-medium text-fg">{API_CONFIG.timeoutMs / 1000} s</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          loading={state.status === "testing"}
          onClick={async () => {
            setState({ status: "testing" });
            try {
              await threatDetectorApi.ping();
              setState({ status: "ok", message: "Backend responded to GET /reports." });
            } catch (err) {
              setState({ status: "error", message: err instanceof ApiError ? err.message : "Connection failed." });
            }
          }}
        >
          <PlugZap /> Test connection
        </Button>
        {state.status === "ok" && (
          <span className="flex items-center gap-1.5 text-sm text-low" role="status">
            <CircleCheck className="size-4" /> {state.message}
          </span>
        )}
        {state.status === "error" && (
          <span className="flex items-center gap-1.5 text-sm text-critical" role="status">
            <CircleX className="size-4" /> {state.message}
          </span>
        )}
      </div>
      <p className="text-xs text-subtle">
        Configure with <code className="font-mono">NEXT_PUBLIC_THREATDETECTOR_MODE</code>, <code className="font-mono">NEXT_PUBLIC_API_BASE_URL</code> and{" "}
        <code className="font-mono">NEXT_PUBLIC_API_TIMEOUT_MS</code> in <code className="font-mono">.env.local</code>. The endpoints are proposed contracts — no backend is
        assumed to exist.
      </p>
    </div>
  );
}

function FeedbackForm() {
  const id = useId();
  const { toast } = useToast();
  const { items, add, download } = useLocalFeedback();
  const [category, setCategory] = useState("result-accuracy");
  const [module, setModule] = useState("general");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) return setError("Please write at least 10 characters.");
    setError(null);
    add({ category, module, message: message.trim() });
    setMessage("");
    toast({ tone: "success", title: "Feedback saved locally", description: "It has not been sent anywhere. Download it to share with the team." });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          id={`${id}-cat`}
          label="Feedback type"
          value={category}
          onChange={setCategory}
          options={[
            { value: "result-accuracy", label: "Result seemed wrong" },
            { value: "explanation", label: "Explanation unclear" },
            { value: "usability", label: "Usability issue" },
            { value: "idea", label: "Feature idea" },
          ]}
        />
        <Select
          id={`${id}-mod`}
          label="Related module"
          value={module}
          onChange={setModule}
          options={[{ value: "general", label: "General" }, ...MODULE_IDS.map((m) => ({ value: m, label: MODULES[m].shortName }))]}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-msg`}>Your feedback</Label>
        <Textarea
          id={`${id}-msg`}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          placeholder="What happened, and what did you expect? Please don't include personal or sensitive information."
          invalid={Boolean(error)}
          className="min-h-24"
        />
        <FieldError>{error}</FieldError>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-subtle">
          {items.length} feedback item{items.length === 1 ? "" : "s"} saved in this browser · not transmitted
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={download} disabled={!items.length}>
            <Download /> Download JSON
          </Button>
          <Button type="submit">
            <Send /> Save feedback
          </Button>
        </div>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const state = useAppState();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<null | "sample" | "empty">(null);

  if (!state.hydrated) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { preferences: p } = state;
  const sampleCount = state.analyses.filter((a) => a.data_source === "sample").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings & privacy" description="Appearance, local data, backend connection and how ThreatDetector's results should be read." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section id="profile" title="Profile" icon={<CircleUserRound />} description="Placeholder — accounts require a backend">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent font-mono text-lg font-semibold text-on-accent">DU</span>
            <div>
              <p className="font-medium text-fg">Demo user</p>
              <p className="text-sm text-muted">Local session · no sign-in</p>
            </div>
          </div>
          <Notice tone="info" className="mt-4">
            ThreatDetector does not implement authentication in this frontend. When a backend with accounts is connected, profile details and
            server-side report storage will appear here.
          </Notice>
        </Section>

        <Section title="Appearance" icon={<Palette />} description="Saved in this browser">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-fg">Theme</p>
              <ThemePicker value={p.theme} />
            </div>
            <Switch id="pref-motion" label="Reduce motion" description="Minimise animations and transitions." checked={p.reducedMotion} onChange={(v) => actions.setPreferences({ reducedMotion: v })} />
            <Switch id="pref-compact" label="Compact tables" description="Denser rows in Reports History." checked={p.compactTables} onChange={(v) => actions.setPreferences({ compactTables: v })} />
            <Switch id="pref-sidebar" label="Collapsed sidebar" description="Show icons only on large screens." checked={p.sidebarCollapsed} onChange={(v) => actions.setPreferences({ sidebarCollapsed: v })} />
          </div>
        </Section>
      </div>

      <Section title="Data storage & retention" icon={<HardDrive />} description="Where your data lives — and where it doesn't">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-medium text-fg">
                <Database className="size-4 text-accent" /> Local demo storage
              </p>
              <Badge tone="success">Active</Badge>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>
                {state.analyses.length} analyses · {state.reports.length} reports · {formatBytes(storageSize())} used
              </li>
              <li>Stored in this browser&apos;s localStorage only; cleared if you clear site data.</li>
              <li>Kept until you delete it — there is no automatic expiry.</li>
              <li>Saved: derived results, scores, signals, short matched snippets, file names & metadata.</li>
              <li>
                <span className="text-fg">Never saved:</span> full message text, uploaded images or videos.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-dashed border-border-strong p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-medium text-fg">
                <ServerCog className="size-4 text-subtle" /> Account storage
              </p>
              <Badge tone="neutral">Not available</Badge>
            </div>
            <p className="mt-3 text-sm text-muted">
              Server-side storage, sync across devices and retention policies require the backend. No data is sent to any server in demo mode.
              {API_CONFIG.mode === "api" && " In API mode, inputs you analyse are sent to the configured backend, which defines its own retention."}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button variant="secondary" onClick={() => setConfirm("sample")}>
            <RotateCcw /> Reset to sample data
          </Button>
          <Button variant="danger" onClick={() => setConfirm("empty")}>
            <Trash2 /> Clear all local data
          </Button>
          <p className="text-xs text-subtle">{sampleCount ? `${sampleCount} sample analyses currently loaded.` : "No sample data loaded."}</p>
        </div>
      </Section>

      <Section title="Backend connection" icon={<PlugZap />} description="Integration status for the proposed FastAPI service">
        <ConnectionTest />
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Responsible AI" icon={<Scale />}>
          <ul className="space-y-3 text-sm text-muted">
            {[
              ["Indicators, not verdicts", "Results describe risk signals and evidence. They never prove content is real, fake, true or false."],
              ["Confidence & coverage", "Every result states how reliable it is and which checks did — and did not — run."],
              ["Honest gaps", "Modules that fail or lack coverage are excluded from scores, never counted as “safe”."],
              ["Human judgement", "Use results to decide what to verify next, especially before sharing, paying or reporting."],
              ["Privacy by default", "Demo mode processes everything in your browser and avoids storing raw content."],
            ].map(([t, b]) => (
              <li key={t} className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="font-medium text-fg">{t}.</span> {b}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Model limitations" icon={<Brain />} description="What each module runs in this build">
          <ul className="space-y-3">
            {MODULE_IDS.map((m) => (
              <li key={m} className="rounded-xl border border-border bg-bg-2/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-fg">{MODULES[m].shortName}</span>
                  <Badge tone="ai">{ENGINES[m].kind}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{ENGINES[m].note}</p>
                <code className="mt-1 block font-mono text-[11px] text-subtle">{ENGINES[m].version}</code>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Send feedback" icon={<MessageSquareText />} description="Help improve explanations and accuracy">
        <FeedbackForm />
      </Section>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "empty" ? "Clear all local data?" : "Reset to sample data?"}
        icon={confirm === "empty" ? <Trash2 className="text-critical" /> : <RotateCcw className="text-accent" />}
        description={
          confirm === "empty"
            ? "All analyses, reports and notifications stored in this browser will be deleted. Your appearance preferences are kept. This cannot be undone."
            : "Your analyses and reports will be replaced with the pre-loaded sample records. Your appearance preferences are kept."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm === "empty" ? "danger" : "primary"}
              onClick={() => {
                if (!confirm) return;
                actions.resetData(confirm);
                toast({ tone: "success", title: confirm === "empty" ? "Local data cleared" : "Sample data restored" });
                setConfirm(null);
              }}
            >
              {confirm === "empty" ? "Clear data" : "Reset data"}
            </Button>
          </>
        }
      />
    </div>
  );
}
