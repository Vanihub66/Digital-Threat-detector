"use client";

import { Camera, Eye, FileImage, Gauge, ImageOff, Microscope } from "lucide-react";
import type { ImageAnalysis } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CoverageCard, DataSourceNotice, LimitationsCard, ModelInfoCard, RecommendationsCard, SummaryCard } from "@/components/results/result-blocks";
import { formatBytes, formatDateTime, formatPercent } from "@/lib/format";
import { sessionCache } from "@/lib/session-cache";
import { cn } from "@/lib/utils";

export function MediaPlaceholder({ kind }: { kind: "image" | "video" }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-bg-2 text-center">
      <ImageOff className="size-6 text-subtle" aria-hidden />
      <p className="text-sm text-muted">Preview not retained</p>
      <p className="max-w-60 text-xs text-subtle">
        Uploaded {kind}s are never stored. Previews are only available in the tab where the file was selected.
      </p>
    </div>
  );
}

export function ImageResult({ result }: { result: ImageAnalysis }) {
  const d = result.details;
  const preview = sessionCache.getPreview(result.id);
  const simulated = d.detector === "simulated";

  const meta: [string, string][] = [
    ["File name", d.file.name],
    ["Type", d.file.type || "—"],
    ["Size", formatBytes(d.file.size)],
    ["Dimensions", d.file.width ? `${d.file.width} × ${d.file.height} px` : "—"],
    ["Megapixels", d.quality.megapixels !== null ? `${d.quality.megapixels} MP` : "—"],
    ["EXIF block", d.exif_present === null ? "Not checked (non-JPEG)" : d.exif_present ? "Present" : "Not found"],
    ["Last modified", formatDateTime(d.file.last_modified)],
  ];

  return (
    <div className="space-y-6">
      <DataSourceNotice result={result} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-center border-b border-border bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--bg-2)_0_50%)] bg-[length:20px_20px]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt={`Analysed image: ${d.file.name}`} className="max-h-96 w-auto object-contain" />
            ) : (
              <MediaPlaceholder kind="image" />
            )}
          </div>
          <CardHeader title="Image metadata" icon={<FileImage />} description="Read from the file by your browser" as="h3" />
          <CardBody>
            <dl className="divide-y divide-border text-sm">
              {meta.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-subtle">{k}</dt>
                  <dd className="truncate text-right text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <SummaryCard
            result={result}
            caption="Manipulation risk"
            extra={simulated ? <Badge tone="ai">Simulated detector score — no detector ran</Badge> : <Badge tone="accent">Detector score from backend</Badge>}
          />
          <Card>
            <CardHeader title="Image quality indicators" icon={<Gauge />} description="Low quality reduces the reliability of any detector" />
            <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
                <p className="text-xs text-subtle">Analysis suitability</p>
                <p className="mt-1 text-lg font-semibold text-fg">{formatPercent(d.quality.score)}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
                <p className="text-xs text-subtle">Compression</p>
                <p className="mt-1 text-lg font-semibold capitalize text-fg">{d.quality.compression}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg-2/60 p-3.5">
                <p className="text-xs text-subtle">Bytes per pixel</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-fg">{d.quality.bytes_per_pixel ?? "—"}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Technical signals"
              icon={<Microscope />}
              description="Strength of each indicator towards synthesis or editing"
              action={simulated ? <Badge tone="ai">Simulated</Badge> : null}
            />
            <CardBody>
              <ul className="space-y-4">
                {d.signals.map((s) => (
                  <li key={s.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-fg">{s.label}</span>
                      <span className="tabular-nums text-muted">{Math.round(s.value * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <div
                        className={cn("h-full rounded-full", s.value >= 0.7 ? "bg-high" : s.value >= 0.45 ? "bg-medium" : "bg-ai")}
                        style={{ width: `${s.value * 100}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-subtle">{s.note}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Visual artefact observations" icon={<Eye />} />
            <CardBody>
              {d.artefacts.length ? (
                <ul className="space-y-2">
                  {d.artefacts.map((a) => (
                    <li key={a} className="flex gap-2 text-sm text-muted">
                      <Camera className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden /> {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-subtle">No notable artefacts were observed.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Why results may be unreliable" icon={<Microscope />} />
            <CardBody className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ["Compression", "Re-saving and platform recompression erase the fine detail detectors rely on."],
                ["Editing & filters", "Ordinary edits (cropping, filters, beauty modes) can look like manipulation."],
                ["Unfamiliar generators", "New image generators may leave traces a detector was never trained on."],
                ["Screenshots", "Screenshots of images remove metadata and add new compression."],
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
          <ModelInfoCard result={result} />
          <LimitationsCard items={result.limitations} />
        </div>
      </div>
    </div>
  );
}
