"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ScanEye, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { baseMeta, detectExif, generateSampleImage, IMAGE_TYPES, readImageDimensions, validateMedia } from "@/lib/media";
import { sessionCache } from "@/lib/session-cache";
import { DEMO_STAGES, isApiMode, runImageAnalysis } from "@/services/analysis-service";
import { FileDropzone } from "./file-dropzone";
import { RunProgress } from "./run-progress";
import { useRunAnalysis } from "./use-run-analysis";

export function ImageForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const handedOff = useRef<string | null>(null);
  const { run, running, stage, progress, cancel } = useRunAnalysis();
  const { toast } = useToast();

  // Revoke the preview URL when it changes or on unmount — unless it was handed to the result page.
  useEffect(() => {
    return () => {
      if (preview && handedOff.current !== preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const select = async (f: File) => {
    const problem = validateMedia(f, "image");
    if (problem) {
      setError(problem);
      return;
    }
    const url = URL.createObjectURL(f);
    const d = await readImageDimensions(url);
    if (!d) {
      URL.revokeObjectURL(url);
      setError("This file could not be decoded as an image. It may be corrupted.");
      return;
    }
    setError(null);
    setFile(f);
    setDims(d);
    setPreview(url);
  };

  const remove = () => {
    setFile(null);
    setPreview(null);
    setDims(null);
    setError(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!file || !preview) return setError("Choose an image to analyse.");
    const meta = { ...baseMeta(file), width: dims?.width, height: dims?.height };
    const url = preview;
    void run(
      async (opts) => runImageAnalysis(file, meta, await detectExif(file), opts),
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
              await select(await generateSampleImage());
            } catch (err) {
              toast({ tone: "error", title: "Could not create sample image", description: err instanceof Error ? err.message : undefined });
            } finally {
              setGenerating(false);
            }
          }}
        >
          <Wand2 /> Use a generated sample image
        </Button>
        <span className="text-xs text-subtle">Created in your browser — no download.</span>
      </div>

      <FileDropzone
        kind="image"
        accept={IMAGE_TYPES.join(",")}
        hint="JPEG, PNG or WebP · up to 10 MB · at least 512 px recommended"
        file={file}
        error={error}
        disabled={running}
        onSelect={(f) => void select(f)}
        onRemove={remove}
        details={dims ? ` · ${dims.width}×${dims.height}px` : null}
        preview={
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          preview && <img src={preview} alt={`Preview of ${file?.name ?? "selected image"}`} className="max-h-80 w-auto object-contain" />
        }
      />

      <Notice tone={isApiMode() ? "info" : "demo"} title={isApiMode() ? "Image will be uploaded to the configured backend" : "Demo mode: your image stays on this device"}>
        {isApiMode()
          ? "The file is sent to the backend's /analyze/image endpoint for analysis."
          : "Metadata and quality are read locally for real; detector signals are simulated and clearly labelled. The image itself is never stored."}
      </Notice>

      {running ? (
        <RunProgress stage={stage} progress={progress} stages={DEMO_STAGES.image} onCancel={cancel} />
      ) : (
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={!file}>
            <ScanEye /> Analyze image
          </Button>
        </div>
      )}
    </form>
  );
}
