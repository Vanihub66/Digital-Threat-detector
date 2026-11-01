"use client";

import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  kind: "image" | "video";
  accept: string;
  hint: string;
  file: File | null;
  error: string | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
  /** Rendered when a file is selected. */
  preview?: ReactNode;
  details?: ReactNode;
}

export function FileDropzone({ kind, accept, hint, file, error, disabled, onSelect, onRemove, preview, details }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const id = useId();

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onSelect(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) pick(e.dataTransfer.files);
  };

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept={accept}
      className="sr-only"
      tabIndex={-1}
      disabled={disabled}
      onChange={(e) => {
        pick(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (file) {
    return (
      <div>
        {input}
        <div className="overflow-hidden rounded-xl border border-border bg-bg-2">
          <div className="flex min-h-56 items-center justify-center bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--bg-2)_0_50%)] bg-[length:20px_20px]">
            {preview}
          </div>
          <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{file.name}</p>
              <p className="text-xs text-subtle">
                {file.type || "unknown type"} · {formatBytes(file.size)}
                {details}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
                <RefreshCw /> Replace
              </Button>
              <Button variant="danger" size="sm" onClick={onRemove} disabled={disabled}>
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
        </div>
        <FieldError>{error}</FieldError>
      </div>
    );
  }

  return (
    <div>
      {input}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-accent bg-accent/5" : error ? "border-critical/50" : "border-border-strong bg-bg-2/50 hover:border-accent/40",
        )}
      >
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border-strong bg-elevated text-accent">
          <UploadCloud className="size-5" aria-hidden />
        </div>
        <p className="relative mt-4 text-sm font-medium text-fg">
          {dragging ? `Drop the ${kind} to select it` : `Drag & drop ${kind === "image" ? "an image" : "a video"} here`}
        </p>
        <p className="relative mt-1 text-xs text-subtle">{hint}</p>
        <Button variant="secondary" size="sm" className="relative mt-4" onClick={() => inputRef.current?.click()} disabled={disabled}>
          Browse files
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
