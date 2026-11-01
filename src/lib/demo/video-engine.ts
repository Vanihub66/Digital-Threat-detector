/**
 * Demo video engine — simulates an asynchronous deepfake-assessment job.
 *
 * Real: file name/type/size, duration and dimensions (read by the browser), and the
 * frame-sampling plan derived from the duration.
 * Simulated: face detection, per-frame scores, temporal consistency and the final
 * likelihood. Progress is derived from elapsed time since `created_at`, so a job
 * resumes correctly after a page reload.
 */
import type { FrameResult, MediaFileMeta, VideoAnalysis, VideoScenario } from "@/types/analysis";
import { hashString, seededRandom } from "@/lib/hash";
import { clamp, round } from "@/lib/utils";
import { riskLevel } from "@/lib/risk";

export const VIDEO_MODEL_VERSION = "demo-video-simulator-0.2.0";

export const VIDEO_QUEUE_MS = 1800;
export const VIDEO_PROCESS_MS = 11000;
const FAILURE_AT = 0.55;

export const VIDEO_SCENARIOS: { id: VideoScenario; label: string; description: string }[] = [
  { id: "standard", label: "Standard run", description: "Faces visible in most sampled frames." },
  { id: "insufficient_faces", label: "Insufficient face coverage", description: "Few frames contain a detectable face." },
  { id: "failure", label: "Processing failure", description: "Simulates a decoding error part-way through." },
];

const LIMITATIONS = [
  "SIMULATED: no face detector or deepfake model ran. Frame scores are deterministic placeholders.",
  "Compression, low resolution, poor lighting and fast motion reduce detection reliability.",
  "Detectors focus on faces; manipulated audio, edits and out-of-context footage are not covered.",
  "Results describe likelihood, not proof. New generation techniques may evade detection.",
];

function plan(file: MediaFileMeta) {
  const duration = file.duration && file.duration > 0 ? file.duration : 20;
  const interval = Math.max(0.5, round(duration / 40, 1));
  const planned = Math.min(40, Math.max(4, Math.floor(duration / interval)));
  return { duration, interval, planned };
}

function computeFrames(file: MediaFileMeta, scenario: VideoScenario): FrameResult[] {
  const { interval, planned } = plan(file);
  const rand = seededRandom(hashString(`${file.name}|${file.size}|${file.duration ?? 0}`));
  const faceProb = scenario === "insufficient_faces" ? 0.15 : 0.9;
  const baseline = 12 + rand() * 55;
  const spikeStart = Math.floor(rand() * planned * 0.6);
  const spikeLen = baseline > 35 ? Math.max(3, Math.floor(planned * 0.25)) : 0;
  return Array.from({ length: planned }, (_, i) => {
    const face = rand() < faceProb;
    const spike = i >= spikeStart && i < spikeStart + spikeLen ? 22 + rand() * 12 : 0;
    const score = Math.round(clamp(baseline + (rand() - 0.5) * 16 + spike, 1, 99));
    return { t: round(i * interval, 1), face, score: face ? score : null };
  });
}

function stageFor(p: number): string {
  if (p < 0.15) return "Extracting frames";
  if (p < 0.3) return "Detecting faces";
  if (p < 0.8) return "Scoring sampled frames";
  if (p < 0.95) return "Checking temporal consistency";
  return "Compiling result";
}

export function createVideoJob(
  file: MediaFileMeta,
  scenario: VideoScenario,
  opts: { id: string; createdAt: string; source?: "demo" | "sample" },
): VideoAnalysis {
  const { interval, planned } = plan(file);
  return {
    id: opts.id,
    module: "video",
    status: "queued",
    title: file.name,
    input_summary: `${file.type || "video"}${file.duration ? ` · ${Math.round(file.duration)} s` : ""}`,
    risk_score: null,
    confidence: null,
    label: "Queued for analysis",
    reasons: [],
    evidence: [],
    limitations: LIMITATIONS,
    recommendations: [],
    model_version: VIDEO_MODEL_VERSION,
    coverage: { ratio: 0, assessed: [], not_assessed: ["Pending"], note: "Analysis has not started yet." },
    data_source: opts.source ?? "demo",
    created_at: opts.createdAt,
    completed_at: null,
    progress: 0,
    details: {
      file,
      scenario,
      stage: "Queued",
      sampling: { interval_s: interval, frames_planned: planned, frames_sampled: 0, frames_with_faces: 0 },
      frames: [],
      temporal: { consistency: null, flagged_transitions: 0, note: "Pending." },
      manipulation_likelihood: null,
      detector: "simulated",
    },
  };
}

function finalize(job: VideoAnalysis, completedAt: string): VideoAnalysis {
  const { file, scenario } = job.details;
  const frames = computeFrames(file, scenario);
  const faceFrames = frames.filter((f): f is FrameResult & { score: number } => f.face && f.score !== null);
  const faceRatio = faceFrames.length / frames.length;
  const sampling = { ...job.details.sampling, frames_sampled: frames.length, frames_with_faces: faceFrames.length };
  const coverageBase = {
    assessed: ["File metadata (real)", "Frame sampling plan (real)", "Face presence (simulated)", "Per-frame scoring (simulated)"],
    not_assessed: ["Trained deepfake detector", "Audio / lip-sync analysis", "Source & context verification"],
  };

  if (faceRatio < 0.3) {
    return {
      ...job,
      status: "insufficient_coverage",
      progress: 1,
      completed_at: completedAt,
      label: "Insufficient face coverage",
      risk_score: null,
      confidence: null,
      reasons: [
        `Only ${faceFrames.length} of ${frames.length} sampled frames contained a detectable face (${Math.round(faceRatio * 100)}%).`,
        "At least 30% face coverage is required before a manipulation likelihood is reported.",
      ],
      evidence: [],
      recommendations: [
        "Try a clip where the speaker's face is visible, well-lit and front-facing.",
        "Check the video's source, upload date and context through other means.",
      ],
      coverage: { ratio: round(faceRatio, 2), ...coverageBase, note: "Too few faces to assess — no score was produced." },
      details: {
        ...job.details,
        stage: "Stopped — insufficient faces",
        sampling,
        frames,
        temporal: { consistency: null, flagged_transitions: 0, note: "Not computed: insufficient face coverage." },
        manipulation_likelihood: null,
      },
    };
  }

  const scores = faceFrames.map((f) => f.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const top = [...scores].sort((a, b) => b - a).slice(0, Math.max(1, Math.ceil(scores.length / 4)));
  const topMean = top.reduce((a, b) => a + b, 0) / top.length;
  const risk = Math.round(clamp(mean * 0.6 + topMean * 0.4, 0, 100));
  let diffSum = 0;
  let flagged = 0;
  for (let i = 1; i < scores.length; i++) {
    const d = Math.abs(scores[i] - scores[i - 1]);
    diffSum += d;
    if (d > 15) flagged++;
  }
  const meanDiff = scores.length > 1 ? diffSum / (scores.length - 1) : 0;
  const consistency = round(clamp(1 - meanDiff / 30, 0, 1), 2);
  const confidence = round(clamp(0.25 + faceRatio * 0.3 + consistency * 0.15, 0.2, 0.7), 2);
  const level = riskLevel(risk);
  const peak = faceFrames.reduce((a, b) => (b.score > a.score ? b : a));

  return {
    ...job,
    status: "completed",
    progress: 1,
    completed_at: completedAt,
    risk_score: risk,
    confidence,
    label:
      level === "low"
        ? "Few manipulation indicators"
        : level === "medium"
          ? "Some manipulation indicators"
          : level === "high"
            ? "Notable manipulation indicators"
            : "Strong manipulation indicators",
    reasons: [
      `Simulated per-frame scores averaged ${Math.round(mean)} across ${faceFrames.length} frames with faces.`,
      `Highest simulated frame score was ${peak.score} at ${peak.t}s.`,
      flagged > 0
        ? `${flagged} abrupt score transition${flagged > 1 ? "s" : ""} between consecutive frames (simulated).`
        : "Frame scores were temporally stable (simulated).",
    ],
    evidence: [
      { id: "faces", title: "Face coverage", detail: `${Math.round(faceRatio * 100)}% of sampled frames contained a face (simulated).`, severity: "info" },
      {
        id: "peak",
        title: "Peak frame",
        detail: `Frame at ${peak.t}s scored ${peak.score}/100 (simulated).`,
        severity: peak.score >= 70 ? "high" : peak.score >= 45 ? "medium" : "low",
      },
      {
        id: "temporal",
        title: "Temporal consistency",
        detail: `Consistency index ${Math.round(consistency * 100)}% with ${flagged} flagged transition(s) (simulated).`,
        severity: consistency < 0.5 ? "high" : consistency < 0.75 ? "medium" : "low",
      },
    ],
    recommendations:
      level === "low"
        ? ["Verify the video's source and original upload before relying on it.", "Treat this as one signal, not proof of authenticity."]
        : [
            "Look for the original upload and compare with other recordings of the same event.",
            "Inspect the flagged time ranges for lip-sync, blinking or boundary artefacts.",
            "Do not share the video as authentic until it is independently verified.",
          ],
    coverage: { ratio: round(0.35 * faceRatio + 0.2, 2), ...coverageBase, note: "Per-frame results are simulated in demo mode." },
    details: {
      ...job.details,
      stage: "Completed",
      sampling,
      frames,
      temporal: {
        consistency,
        flagged_transitions: flagged,
        note: consistency >= 0.75 ? "Scores change smoothly between frames." : "Scores fluctuate between neighbouring frames.",
      },
      manipulation_likelihood: round(risk / 100, 2),
    },
  };
}

/** Returns the job's state at `now`, or the same object when nothing changed. */
export function advanceVideoDemo(job: VideoAnalysis, now: number): VideoAnalysis {
  if (job.status !== "queued" && job.status !== "processing") return job;
  const elapsed = now - new Date(job.created_at).getTime();
  if (elapsed < VIDEO_QUEUE_MS) return job;
  const p = clamp((elapsed - VIDEO_QUEUE_MS) / VIDEO_PROCESS_MS, 0, 1);
  const completedAt = new Date(new Date(job.created_at).getTime() + VIDEO_QUEUE_MS + VIDEO_PROCESS_MS * Math.min(p, 1)).toISOString();

  if (job.details.scenario === "failure" && p >= FAILURE_AT) {
    return {
      ...job,
      status: "failed",
      progress: FAILURE_AT,
      completed_at: completedAt,
      label: "Analysis failed",
      error: "Simulated failure: the video stream could not be decoded after frame extraction began.",
      reasons: ["Processing stopped before a result could be produced. No score was generated."],
      recommendations: ["Re-encode the video as MP4 (H.264) and try again.", "Try a shorter clip under 60 seconds."],
      coverage: { ratio: 0, assessed: [], not_assessed: ["All checks — processing failed"], note: "No result available." },
      details: { ...job.details, stage: "Failed during frame scoring" },
    };
  }
  if (p >= 1) return finalize(job, completedAt);

  const all = computeFrames(job.details.file, job.details.scenario);
  const revealed = p < 0.3 ? 0 : Math.min(all.length, Math.floor((all.length * (p - 0.3)) / 0.5));
  const frames = all.slice(0, revealed);
  const next: VideoAnalysis = {
    ...job,
    status: "processing",
    progress: round(p, 3),
    label: "Processing",
    details: {
      ...job.details,
      stage: stageFor(p),
      frames,
      sampling: {
        ...job.details.sampling,
        frames_sampled: p < 0.15 ? Math.floor((all.length * p) / 0.15) : all.length,
        frames_with_faces: frames.filter((f) => f.face).length,
      },
    },
  };
  return next;
}

/** Synchronously run a job to completion — used for seeding sample data. */
export function completeVideoDemo(job: VideoAnalysis): VideoAnalysis {
  return advanceVideoDemo(job, new Date(job.created_at).getTime() + VIDEO_QUEUE_MS + VIDEO_PROCESS_MS + 1);
}
