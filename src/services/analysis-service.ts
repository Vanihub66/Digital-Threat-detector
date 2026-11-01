/**
 * The single entry point components use to run analyses.
 *
 * - mode "demo": runs the labelled in-browser demo engines (nothing is uploaded).
 * - mode "api":  calls the FastAPI backend; if it is unreachable, falls back to the
 *                demo engines and reports `fellBack: true` so the UI can say so.
 */
import type { AnalysisResult, MediaFileMeta, VideoAnalysis, VideoScenario } from "@/types/analysis";
import { analyzeScamDemo, type ScamInput } from "@/lib/demo/scam-engine";
import { analyzeClaimDemo, type ClaimInput } from "@/lib/demo/claim-engine";
import { analyzeImageDemo } from "@/lib/demo/image-engine";
import { advanceVideoDemo, createVideoJob } from "@/lib/demo/video-engine";
import { createId, sleep } from "@/lib/utils";
import { API_CONFIG } from "./api/config";
import { ApiError } from "./api/client";
import { threatDetectorApi } from "./api/endpoints";

export interface RunOptions {
  signal?: AbortSignal;
  onStage?: (stage: string, progress: number) => void;
}

export interface RunOutcome<T extends AnalysisResult = AnalysisResult> {
  result: T;
  /** True when the backend was configured but unreachable and demo output was used instead. */
  fellBack: boolean;
  notice?: string;
}

export const DEMO_STAGES = {
  scam: ["Parsing message", "Checking language patterns", "Inspecting URL structure", "Compiling explanation"],
  claim: ["Assessing claim structure", "Checking for evidence packs", "Weighing stance & coverage", "Preparing verification steps"],
  image: ["Reading file metadata", "Measuring image quality", "Running simulated detector", "Compiling assessment"],
  video: ["Uploading to job queue"],
} as const;

export function isApiMode(): boolean {
  return API_CONFIG.mode === "api";
}

async function simulate(stages: readonly string[], totalMs: number, opts: RunOptions) {
  for (let i = 0; i < stages.length; i++) {
    opts.onStage?.(stages[i], i / stages.length);
    await sleep(totalMs / stages.length, opts.signal);
  }
  opts.onStage?.("Done", 1);
}

async function withBackend<T extends AnalysisResult>(apiCall: () => Promise<T>, demo: () => Promise<T>): Promise<RunOutcome<T>> {
  if (API_CONFIG.mode !== "api") return { result: await demo(), fellBack: false };
  try {
    return { result: await apiCall(), fellBack: false };
  } catch (err) {
    if (err instanceof ApiError && err.isUnavailable) {
      return { result: await demo(), fellBack: true, notice: err.message };
    }
    throw err;
  }
}

const now = () => new Date().toISOString();

export function runScamAnalysis(input: ScamInput, opts: RunOptions = {}): Promise<RunOutcome> {
  return withBackend<AnalysisResult>(
    () =>
      input.text?.trim()
        ? threatDetectorApi.analyzeText({ text: input.text, url: input.url || undefined }, opts)
        : threatDetectorApi.analyzeUrl({ url: input.url ?? "" }, opts),
    async () => {
      await simulate(DEMO_STAGES.scam, 1800, opts);
      return analyzeScamDemo(input, { id: createId("AN"), createdAt: now() });
    },
  );
}

export function runClaimVerification(input: ClaimInput, opts: RunOptions = {}): Promise<RunOutcome> {
  return withBackend<AnalysisResult>(
    () => threatDetectorApi.verifyClaim({ claim: input.claim, context: input.context }, opts),
    async () => {
      await simulate(DEMO_STAGES.claim, 2200, opts);
      return analyzeClaimDemo(input, { id: createId("AN"), createdAt: now() });
    },
  );
}

export function runImageAnalysis(file: File, meta: MediaFileMeta, exifPresent: boolean | null, opts: RunOptions = {}): Promise<RunOutcome> {
  return withBackend<AnalysisResult>(
    () => threatDetectorApi.analyzeImage(file, opts),
    async () => {
      await simulate(DEMO_STAGES.image, 2400, opts);
      return analyzeImageDemo({ file: meta, exifPresent }, { id: createId("AN"), createdAt: now() });
    },
  );
}

export function submitVideoAnalysis(file: File, meta: MediaFileMeta, scenario: VideoScenario, opts: RunOptions = {}): Promise<RunOutcome> {
  return withBackend<AnalysisResult>(
    () => threatDetectorApi.analyzeVideo(file, opts),
    async () => {
      await simulate(DEMO_STAGES.video, 700, opts);
      return createVideoJob(meta, scenario, { id: createId("AN"), createdAt: now() });
    },
  );
}

/** Advances an in-flight video job: polls the backend for API jobs, simulates for demo jobs. */
export async function refreshVideoJob(job: VideoAnalysis): Promise<VideoAnalysis> {
  if (job.data_source === "api") {
    const next = await threatDetectorApi.getVideoJob(job.id);
    return next.module === "video" ? next : job;
  }
  return advanceVideoDemo(job, Date.now());
}
