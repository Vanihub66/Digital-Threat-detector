"use client";

import { Activity, CircleAlert, Clapperboard, Film, Frame, LoaderCircle, ScanFace, TriangleAlert } from "lucide-react";
import type { VideoAnalysis } from "@/types/analysis";
import { FrameChart } from "@/components/charts/frame-chart";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { Notice } from "@/components/ui/notice";
import { CoverageCard, DataSourceNotice, LimitationsCard, ModelInfoCard, RecommendationsCard, SummaryCard } from "@/components/results/result-blocks";
import { formatBytes, formatDuration, formatPercent } from "@/lib/format";
import { sessionCache } from "@/lib/session-cache";
import { cn } from "@/lib/utils";
import { MediaPlaceholder } from "@/features/image-analysis/image-result";

const PIPELINE = ["Queued", "Extracting frames", "Detecting faces", "Scoring sampled frames", "Checking temporal consistency", "Compiling result"];

function PipelineProgress({ result }: { result: VideoAnalysis }) {
  const stage = result.details.stage;
  const idx = Math.max(0, PIPELINE.indexOf(stage));
  return (
    <Card className="border-accent/25">
      <CardHeader
        title={result.status === "queued" ? "Waiting in queue" : "Analysing video"}
        icon={<LoaderCircle className="animate-spin" />}
        description="This runs in the background — you can leave this page and come back."
        action={<Badge tone="info">{Math.round((result.progress ?? 0) * 100)}%</Badge>}
      />
      <CardBody className="space-y-5">
        <ProgressBar value={result.progress ?? 0} label="Video analysis progress" />
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Pipeline stages">
          {PIPELINE.map((s, i) => (
            <li
              key={s}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                i < idx ? "border-low/30 bg-low/5 text-low" : i === idx ? "border-accent/40 bg-accent/10 text-fg" : "border-border text-subtle",
              )}
              aria-current={i === idx ? "step" : undefined}
            >
              <span className="block text-[10px] opacity-70">Step {i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export function VideoResult({ result }: { result: VideoAnalysis }) {
  const d = result.details;
  const preview = sessionCache.getPreview(result.id);
  const running = result.status === "queued" || result.status === "processing";
  const faceRatio = d.sampling.frames_sampled ? d.sampling.frames_with_faces / d.sampling.frames_sampled : 0;
  const simulated = d.detector === "simulated";

  return (
    <div className="space-y-6">
      <DataSourceNotice result={result} />

      {running && <PipelineProgress result={result} />}
      {result.status === "failed" && (
        <Notice
          tone="warning"
          title="Analysis failed"
          icon={<CircleAlert className="text-critical" />}
          action={
            <ButtonLink href="/analyze/video" size="sm" variant="secondary">
              Try again
            </ButtonLink>
          }
        >
          {result.error ?? "The video could not be processed."} No score was produced, and this module will be excluded from the unified report.
        </Notice>
      )}
      {result.status === "insufficient_coverage" && (
        <Notice tone="warning" title="Insufficient face coverage — no score produced" icon={<ScanFace />}>
          Only {d.sampling.frames_with_faces} of {d.sampling.frames_sampled} sampled frames contained a detectable face. ThreatDetector does not
          report a manipulation likelihood without enough evidence; this module will be listed as “not assessed” in the unified report.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="overflow-hidden">
          <div className="bg-black">
            {preview ? (
              <video src={preview} controls muted playsInline className="max-h-96 w-full" aria-label={`Analysed video: ${d.file.name}`} />
            ) : (
              <MediaPlaceholder kind="video" />
            )}
          </div>
          <CardHeader title="File metadata" icon={<Film />} description="Read by your browser" as="h3" />
          <CardBody>
            <dl className="divide-y divide-border text-sm">
              {(
                [
                  ["File name", d.file.name],
                  ["Type", d.file.type || "—"],
                  ["Size", formatBytes(d.file.size)],
                  ["Duration", d.file.duration ? formatDuration(d.file.duration) : "Unknown"],
                  ["Resolution", d.file.width ? `${d.file.width} × ${d.file.height}` : "—"],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-subtle">{k}</dt>
                  <dd className="truncate text-right text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {!running && result.status !== "failed" && (
            <SummaryCard
              result={result}
              caption="Manipulation risk"
              extra={
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">
                    Likelihood {d.manipulation_likelihood === null ? "not reported" : formatPercent(d.manipulation_likelihood)}
                  </Badge>
                  {simulated && <Badge tone="ai">Simulated frame scores</Badge>}
                </div>
              }
            />
          )}
          <Card>
            <CardHeader title="Frame sampling coverage" icon={<Frame />} />
            <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Planned frames", d.sampling.frames_planned],
                ["Sampled", d.sampling.frames_sampled],
                ["With faces", d.sampling.frames_with_faces],
                ["Interval", `${d.sampling.interval_s}s`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-xl border border-border bg-bg-2/60 p-3.5">
                  <p className="text-xs text-subtle">{k}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-fg">{v}</p>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4">
                <div className="flex justify-between text-xs text-muted">
                  <span>Face coverage</span>
                  <span className="tabular-nums">{d.sampling.frames_sampled ? formatPercent(faceRatio) : "—"} (min. 30%)</span>
                </div>
                <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn("h-full rounded-full", faceRatio >= 0.3 ? "bg-accent" : "bg-medium")} style={{ width: `${faceRatio * 100}%` }} />
                  <div className="absolute inset-y-0 left-[30%] w-px bg-fg/40" aria-hidden />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {result.status !== "queued" && result.status !== "failed" && (
        <Card>
          <CardHeader
            title="Per-frame results"
            icon={<Clapperboard />}
            description={running ? "Frames appear as they are scored" : "Manipulation score for each sampled frame"}
            action={simulated ? <Badge tone="ai">Simulated demo data</Badge> : null}
          />
          <CardBody>
            {d.frames.length || running ? (
              <FrameChart frames={d.frames} planned={d.sampling.frames_planned} />
            ) : (
              <p className="text-sm text-subtle">No frame results available.</p>
            )}
          </CardBody>
        </Card>
      )}

      {!running && result.status !== "failed" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Temporal consistency" icon={<Activity />} description="How smoothly frame scores change over time" />
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
                    <p className="text-xs text-subtle">Consistency index</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
                      {d.temporal.consistency === null ? "—" : formatPercent(d.temporal.consistency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
                    <p className="text-xs text-subtle">Abrupt transitions</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-fg">{d.temporal.flagged_transitions}</p>
                  </div>
                </div>
                <p className="text-sm text-muted">{d.temporal.note}</p>
                {result.reasons.length > 0 && (
                  <ul className="list-disc space-y-1 border-t border-border pt-4 pl-5 text-sm text-muted">
                    {result.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Known limitations of video analysis" icon={<TriangleAlert className="text-medium" />} />
              <CardBody className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Compression & resolution", "Low bitrate and small faces hide blending artefacts."],
                  ["Lighting & motion", "Dark scenes, motion blur and occlusions reduce face detection."],
                  ["Audio not assessed", "Voice cloning and lip-sync mismatches are not analysed."],
                  ["Context", "Authentic footage can still be misleading if shown out of context."],
                ].map(([t, b]) => (
                  <div key={t} className="rounded-xl border border-border bg-bg-2/60 p-3.5">
                    <p className="font-medium text-fg">{t}</p>
                    <p className="mt-1 text-xs text-muted">{b}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
          <div className="space-y-6">
            <RecommendationsCard items={result.recommendations} />
            <CoverageCard result={result} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ModelInfoCard result={result} />
        <LimitationsCard items={result.limitations} />
      </div>
      {result.status === "failed" && result.recommendations.length > 0 && <RecommendationsCard items={result.recommendations} />}
    </div>
  );
}
