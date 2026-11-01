"use client";

import { useId, useState, type FormEvent } from "react";
import { Eraser, Link2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SCAM_EXAMPLES } from "@/lib/demo/examples";
import { isPlausibleUrl } from "@/lib/demo/scam-engine";
import { sessionCache } from "@/lib/session-cache";
import { cn } from "@/lib/utils";
import { DEMO_STAGES, isApiMode, runScamAnalysis } from "@/services/analysis-service";
import { ExamplePicker } from "./example-picker";
import { RunProgress } from "./run-progress";
import { useRunAnalysis } from "./use-run-analysis";

const MAX_TEXT = 5000;

export function TextUrlForm() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<{ text?: string; url?: string; form?: string }>({});
  const { run, running, stage, progress, cancel } = useRunAnalysis();
  const ids = { text: useId(), url: useId(), textHint: useId(), urlHint: useId() };

  const validate = () => {
    const e: typeof errors = {};
    const t = text.trim();
    const u = url.trim();
    if (!t && !u) e.form = "Paste a message, enter a URL, or both.";
    if (t && t.length < 10) e.text = "Please paste at least 10 characters so there is enough context.";
    if (t.length > MAX_TEXT) e.text = `Messages are limited to ${MAX_TEXT.toLocaleString()} characters.`;
    if (u && !isPlausibleUrl(u)) e.url = "This doesn't look like a valid URL (e.g. https://example.com/page).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const input = { text: text.trim(), url: url.trim() };
    void run(
      (opts) => runScamAnalysis(input, opts),
      (r) => input.text && sessionCache.setText(r.id, input.text),
    );
  };

  const clear = () => {
    setText("");
    setUrl("");
    setErrors({});
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <ExamplePicker
        examples={SCAM_EXAMPLES}
        disabled={running}
        onPick={(ex) => {
          setText(ex.text);
          setUrl(ex.url);
          setErrors({});
        }}
      />

      <div>
        <div className="flex items-end justify-between">
          <Label htmlFor={ids.text}>Message or email text</Label>
          <span className={cn("mb-1.5 text-xs tabular-nums", text.length > MAX_TEXT ? "text-critical" : "text-subtle")} aria-live="polite">
            {text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}
          </span>
        </div>
        <Textarea
          id={ids.text}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a suspicious SMS, chat message or email body…"
          rows={8}
          disabled={running}
          invalid={Boolean(errors.text)}
          aria-describedby={errors.text ? `${ids.text}-err` : ids.textHint}
          className="min-h-48"
        />
        {errors.text ? (
          <FieldError id={`${ids.text}-err`}>{errors.text}</FieldError>
        ) : (
          <FieldHint id={ids.textHint}>
            Links inside the text are detected automatically. The raw text is kept only in this tab&apos;s memory — never saved.
          </FieldHint>
        )}
      </div>

      <div>
        <Label htmlFor={ids.url}>URL (optional)</Label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            id={ids.url}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/login"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={running}
            invalid={Boolean(errors.url)}
            aria-describedby={errors.url ? `${ids.url}-err` : ids.urlHint}
            className="pl-10 font-mono text-[13px]"
          />
        </div>
        {errors.url ? (
          <FieldError id={`${ids.url}-err`}>{errors.url}</FieldError>
        ) : (
          <FieldHint id={ids.urlHint}>
            {isApiMode()
              ? "The URL is sent to the configured backend for analysis."
              : "Only the URL's structure is inspected. ThreatDetector never opens or fetches the link in demo mode."}
          </FieldHint>
        )}
      </div>

      {errors.form && <Notice tone="warning">{errors.form}</Notice>}

      {running ? (
        <RunProgress stage={stage} progress={progress} stages={DEMO_STAGES.scam} onCancel={cancel} />
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={clear} disabled={!text && !url}>
            <Eraser /> Clear
          </Button>
          <Button type="submit" size="lg" disabled={!text.trim() && !url.trim()}>
            <ScanSearch /> Analyze message
          </Button>
        </div>
      )}
    </form>
  );
}
