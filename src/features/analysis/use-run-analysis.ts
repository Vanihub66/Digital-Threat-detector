"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/types/analysis";
import { useToast } from "@/components/ui/toast";
import { MODULES } from "@/lib/modules";
import { ApiError } from "@/services/api/client";
import type { RunOptions, RunOutcome } from "@/services/analysis-service";
import { ValidationError } from "@/services/validation";
import { actions } from "@/store/app-store";

export interface RunState {
  running: boolean;
  stage: string;
  progress: number;
  error: string | null;
}

/**
 * Shared submit flow for every module: progress stages, cancellation, error
 * feedback, adding the result to the draft report and navigating to it.
 */
export function useRunAnalysis() {
  const router = useRouter();
  const { toast } = useToast();
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<RunState>({ running: false, stage: "", progress: 0, error: null });

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (exec: (opts: RunOptions) => Promise<RunOutcome>, onResult?: (r: AnalysisResult) => void) => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      setState({ running: true, stage: "Preparing", progress: 0, error: null });
      try {
        const outcome = await exec({
          signal: ctrl.signal,
          onStage: (stage, progress) => setState((s) => ({ ...s, stage, progress })),
        });
        const result = outcome.result;
        onResult?.(result);
        actions.addAnalysis(result);
        if (outcome.fellBack) {
          toast({
            tone: "warning",
            title: "Backend unavailable — demo output shown",
            description: `${outcome.notice ?? ""} The result is clearly labelled as demo output.`.trim(),
          });
        } else if (result.status === "queued" || result.status === "processing") {
          toast({ tone: "info", title: "Video queued for analysis", description: "You can keep working — we'll notify you when it finishes." });
        } else {
          toast({ tone: "success", title: `${MODULES[result.module].shortName} analysis complete`, description: result.label });
        }
        setState({ running: false, stage: "Done", progress: 1, error: null });
        router.push(`/results/${result.id}`);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setState({ running: false, stage: "", progress: 0, error: null });
          toast({ tone: "info", title: "Analysis cancelled" });
          return;
        }
        if (err instanceof ApiError && err.kind === "aborted") {
          setState({ running: false, stage: "", progress: 0, error: null });
          return;
        }
        const message =
          err instanceof ApiError || err instanceof ValidationError
            ? err.message
            : "Something went wrong while running the analysis. Please try again.";
        setState({ running: false, stage: "", progress: 0, error: message });
        toast({ tone: "error", title: "Analysis failed", description: message });
      } finally {
        if (controller.current === ctrl) controller.current = null;
      }
    },
    [router, toast],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);

  return { ...state, run, cancel };
}
