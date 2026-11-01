"use client";

import { useId, useState, type FormEvent } from "react";
import { CalendarDays, ChevronDown, Eraser, FileSearch, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { CLAIM_EXAMPLES } from "@/lib/demo/claim-engine";
import { cn } from "@/lib/utils";
import { DEMO_STAGES, runClaimVerification } from "@/services/analysis-service";
import type { ClaimContext } from "@/types/analysis";
import { ExamplePicker } from "./example-picker";
import { RunProgress } from "./run-progress";
import { useRunAnalysis } from "./use-run-analysis";

const MAX_CLAIM = 500;

export function ClaimForm() {
  const [claim, setClaim] = useState("");
  const [ctx, setCtx] = useState<ClaimContext>({});
  const [showContext, setShowContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run, running, stage, progress, cancel } = useRunAnalysis();
  const id = useId();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const c = claim.trim();
    if (c.length < 15) return setError("Please enter a complete claim (at least 15 characters).");
    if (c.length > MAX_CLAIM) return setError(`Claims are limited to ${MAX_CLAIM} characters. Split long text into separate claims.`);
    setError(null);
    const context = Object.fromEntries(Object.entries(ctx).filter(([, v]) => typeof v === "string" && v.trim())) as ClaimContext;
    void run((opts) => runClaimVerification({ claim: c, context }, opts));
  };

  const setField = (k: keyof ClaimContext) => (e: React.ChangeEvent<HTMLInputElement>) => setCtx((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <ExamplePicker
        examples={CLAIM_EXAMPLES}
        disabled={running}
        onPick={(ex) => {
          setClaim(ex.claim);
          setCtx(ex.context);
          setShowContext(Boolean(ex.context.date || ex.context.location || ex.context.entities || ex.context.notes));
          setError(null);
        }}
      />

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-bg-2/60 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium text-fg">Make claims specific and checkable</p>
          <p className="mt-1 text-xs text-muted">Include who, what, when and where. Avoid opinions, predictions and vague words like “they” or “everyone”.</p>
        </div>
        <div className="space-y-1.5 text-xs">
          <p className="text-low">✓ “City X opened a 12 km metro line in March 2025.”</p>
          <p className="text-critical">✗ “They are hiding the truth about the new policy.”</p>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between">
          <Label htmlFor={`${id}-claim`}>Claim to verify</Label>
          <span className={cn("mb-1.5 text-xs tabular-nums", claim.length > MAX_CLAIM ? "text-critical" : "text-subtle")}>
            {claim.length} / {MAX_CLAIM}
          </span>
        </div>
        <Textarea
          id={`${id}-claim`}
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder="e.g. “The city council approved a 15% increase in public transport fares in January 2025.”"
          rows={4}
          disabled={running}
          invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : `${id}-hint`}
        />
        {error ? (
          <FieldError id={`${id}-err`}>{error}</FieldError>
        ) : (
          <FieldHint id={`${id}-hint`}>One factual statement per analysis gives the clearest evidence review.</FieldHint>
        )}
      </div>

      <div className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setShowContext((v) => !v)}
          aria-expanded={showContext}
          aria-controls={`${id}-ctx`}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-fg"
        >
          Optional context
          <ChevronDown className={cn("size-4 text-subtle transition-transform", showContext && "rotate-180")} aria-hidden />
        </button>
        {showContext && (
          <div id={`${id}-ctx`} className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${id}-date`} className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-subtle" aria-hidden /> Date or period
              </Label>
              <Input id={`${id}-date`} value={ctx.date ?? ""} onChange={setField("date")} placeholder="e.g. March 2025" disabled={running} />
            </div>
            <div>
              <Label htmlFor={`${id}-loc`} className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-subtle" aria-hidden /> Location
              </Label>
              <Input id={`${id}-loc`} value={ctx.location ?? ""} onChange={setField("location")} placeholder="e.g. Riverton" disabled={running} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`${id}-ent`} className="flex items-center gap-1.5">
                <Users className="size-3.5 text-subtle" aria-hidden /> Named people or organisations
              </Label>
              <Input id={`${id}-ent`} value={ctx.entities ?? ""} onChange={setField("entities")} placeholder="e.g. Riverton Transit Authority" disabled={running} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`${id}-notes`}>Where did you see it?</Label>
              <Input id={`${id}-notes`} value={ctx.notes ?? ""} onChange={setField("notes")} placeholder="e.g. Forwarded message, social media post" disabled={running} />
            </div>
          </div>
        )}
      </div>

      {running ? (
        <RunProgress stage={stage} progress={progress} stages={DEMO_STAGES.claim} onCancel={cancel} />
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setClaim("");
              setCtx({});
              setError(null);
            }}
            disabled={!claim && !Object.values(ctx).some(Boolean)}
          >
            <Eraser /> Clear
          </Button>
          <Button type="submit" size="lg" disabled={!claim.trim()}>
            <FileSearch /> Analyze claim
          </Button>
        </div>
      )}
    </form>
  );
}
