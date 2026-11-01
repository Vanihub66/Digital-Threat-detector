"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Clapperboard, Clock, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { formatDuration } from "@/lib/format";
import { baseMeta, generateSampleVideo, readVideoMeta, validateMedia, VIDEO_TYPES } from "@/lib/media";
import { VIDEO_SCENARIOS } from "@/lib/demo/video-engine";
import { sessionCache } from "@/lib/session-cache";
import { cn } from "@/lib/utils";
import { DEMO_STAGES, isApiMode, submitVideoAnalysis } from "@/services/analysis-service";
import type { VideoScenario } from "@/types/analysis";
import { FileDropzone } from "./file-dropzone";
import { RunProgress } from "./run-progress";
import { useRunAnalysis } from "./use-run-analysis";

type VideoInfo = { width: number; height: number; duration: number };

export function VideoForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<VideoScenario>("standard");
  const [generating, setGenerating] = useState(false);
  const handedOff = useRef<string | null>(null);
  const { run, running, stage, progress, cancel } = useRunAnalysis();
  const { toast } = useToast();
  const api = isApiMode();

  useEffect(() => {
    return () => {
      if (preview && handedOff.current !== preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const select = async (f: File, knownDuration?: number) => {
    const problem = validateMedia(f, "video");
    if (problem) {
      setError(problem);
      return;
    }
    const url = URL.createObjectURL(f);
    const meta = await readVideoMeta(url);
    setError(null);
    setFile(f);
    setPreview(url);
    setInfo(meta ? { ...meta, duration: meta.duration || knownDuration || 0 } : knownDuration ? { width: 0, height: 0, duration: knownDuration } : null);
    if (meta && meta.duration > 120) {
      toast({ tone: "warning", title: "Long video", description: "Clips under 60 seconds give faster, more focused results." });
    }
  };

  const remove = () => {
    setFile(null);
    setPreview(null);
    setInfo(null);
    setError(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!file || !preview) return setError("Choose a video to analyse.");
    const meta = {
      ...baseMeta(file),
      width: info?.width || undefined,
      height: info?.height || undefined,
      duration: info?.duration || undefined,
    };
    const url = preview;
    void run(
      (opts) => submitVideoAnalysis(file, meta, scenario, opts),
      (r) => {
        handedOff.current = url;
        sessionCache.setPreview(r.id, url);
      },
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          loading={generating}
          disabled={running}
          onClick={async () => {
            setGenerating(true);
            try {
              await select(await generateSampleVideo(4), 4);
            } catch (err) {
              toast({ tone: "error", title: "Could not record a sample clip", description: err instanceof Error ? err.message : undefined });
            } finally {
              setGenerating(false);
            }
          }}
        >
          <Clapperboard /> {generating ? "Recording 4 s sample…" : "Record a 4-second sample clip"}
        </Button>
        <span className="text-xs text-subtle">Generated from an animated canvas in your browser.</span>
      </div>

      <FileDropzone
        kind="video"
        accept={VIDEO_TYPES.join(",")}
        hint="MP4, WebM or MOV · up to 100 MB · clips under 60 s recommended"
        file={file}
        error={error}
        disabled={running}
        onSelect={(f) => void select(f)}
        onRemove={remove}
        details={
          info ? (
            <>
              {info.duration ? ` · ${formatDuration(info.duration)}` : ""}
              {info.width ? ` · ${info.width}×${info.height}` : ""}
            </>
          ) : null
        }
        preview={preview && <video src={preview} controls muted playsInline className="max-h-80 w-full bg-black" aria-label={`Preview of ${file?.name ?? "video"}`} />}
      />

      {!api && (
        <fieldset className="rounded-xl border border-ai/25 bg-ai/[0.04] p-4">
          <legend className="px-1 text-sm font-medium text-fg">Demo scenario</legend>
          <p className="mb-3 text-xs text-muted">
            Controls the simulated outcome so every state of the asynchronous workflow can be demonstrated. Not available with a real backend.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Demo scenario">
            {VIDEO_SCENARIOS.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                  scenario === s.id ? "border-ai/50 bg-ai/10" : "border-border hover:border-border-strong",
                )}
              >
                <input
                  type="radio"
                  name="scenario"
                  value={s.id}
                  checked={scenario === s.id}
                  onChange={() => setScenario(s.id)}
                  className="sr-only"
                  disabled={running}
                />
                <span className="block font-medium text-fg">{s.label}</span>
                <span className="mt-0.5 block text-xs text-subtle">{s.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Notice tone="info" title="Runs asynchronously" icon={<Clock />}>
          Video analysis is queued and processed in the background. You can leave this page — you&apos;ll get a notification when it finishes.
        </Notice>
        <Notice tone={api ? "info" : "demo"} title={api ? "Uploaded to the configured backend" : "Stays on this device"} icon={<Film />}>
          {api
            ? "The file is sent to /analyze/video. Polling uses the proposed /analyze/video/{id} endpoint."
            : "Duration and resolution are read locally; face detection and frame scores are simulated."}
        </Notice>
      </div>

      {running ? (
        <RunProgress stage={stage} progress={progress} stages={DEMO_STAGES.video} onCancel={cancel} />
      ) : (
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={!file}>
            <Film /> Analyze video
          </Button>
        </div>
      )}
    </form>
  );
}
