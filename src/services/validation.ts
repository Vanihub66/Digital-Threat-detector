/**
 * Runtime validation for data coming from the backend (or from localStorage).
 * Missing optional fields get safe defaults; structurally invalid payloads throw
 * a ValidationError so the UI can show a clear message instead of crashing.
 */
import type {
  AnalysisCoverage,
  AnalysisResult,
  AnalysisStatus,
  ClaimDetails,
  ClaimVerdict,
  EvidenceItem,
  ImageDetails,
  MediaFileMeta,
  ModuleId,
  ScamDetails,
  SignalSeverity,
  SourceItem,
  VideoDetails,
} from "@/types/analysis";
import { isModuleId } from "@/lib/modules";
import { clamp } from "@/lib/utils";
import type { ReportListResponse, ReportResponse } from "./api/contracts";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const optStr = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const objArr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);

const STATUSES: AnalysisStatus[] = ["queued", "processing", "completed", "failed", "insufficient_coverage"];
const SEVERITIES: SignalSeverity[] = ["info", "low", "medium", "high"];
const VERDICTS: ClaimVerdict[] = ["supports", "contradicts", "mixed", "insufficient", "needs_clarification"];

/** Accepts 0–1 or 0–100 and returns 0–1. */
function unit(v: unknown): number | null {
  const n = num(v);
  if (n === null) return null;
  return clamp(n > 1 ? n / 100 : n, 0, 1);
}

function score(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.round(clamp(n, 0, 100));
}

function evidence(v: unknown): EvidenceItem[] {
  return objArr(v).map((e, i) => ({
    id: str(e.id, `ev-${i}`),
    title: str(e.title, "Evidence"),
    detail: str(e.detail),
    severity: SEVERITIES.includes(e.severity as SignalSeverity) ? (e.severity as SignalSeverity) : "info",
    category: optStr(e.category),
    snippet: optStr(e.snippet),
  }));
}

function coverage(v: unknown): AnalysisCoverage {
  const c = isObj(v) ? v : {};
  return {
    ratio: unit(c.ratio) ?? 0,
    assessed: strArr(c.assessed),
    not_assessed: strArr(c.not_assessed),
    note: optStr(c.note),
  };
}

function fileMeta(v: unknown): MediaFileMeta {
  const f = isObj(v) ? v : {};
  return {
    name: str(f.name, "uploaded file"),
    type: str(f.type),
    size: num(f.size) ?? 0,
    last_modified: optStr(f.last_modified),
    width: num(f.width) ?? undefined,
    height: num(f.height) ?? undefined,
    duration: num(f.duration) ?? undefined,
  };
}

function scamDetails(d: Obj): ScamDetails {
  return {
    input_kind: d.input_kind === "url" || d.input_kind === "text_and_url" ? d.input_kind : "text",
    char_count: num(d.char_count) ?? 0,
    url_count: num(d.url_count) ?? 0,
    url: isObj(d.url) ? (d.url as unknown as ScamDetails["url"]) : undefined,
    language_signals: objArr(d.language_signals) as unknown as ScamDetails["language_signals"],
    url_signals: objArr(d.url_signals) as unknown as ScamDetails["url_signals"],
    reputation_lookup: d.reputation_lookup === "performed" ? "performed" : "not_performed",
  };
}

function claimDetails(d: Obj): ClaimDetails {
  const ck = isObj(d.checkability) ? d.checkability : {};
  const sources: SourceItem[] = objArr(d.sources).map((s, i) => {
    const url = optStr(s.url);
    return {
      id: str(s.id, `src-${i}`),
      publisher: str(s.publisher, "Unknown publisher"),
      title: str(s.title),
      date: optStr(s.date) ?? null,
      excerpt: str(s.excerpt),
      stance: s.stance === "supports" || s.stance === "contradicts" ? s.stance : "neutral",
      relevance: unit(s.relevance) ?? 0,
      // A link is only kept for sources not marked illustrative.
      url: s.illustrative === true ? undefined : url,
      illustrative: s.illustrative === true,
    };
  });
  return {
    claim: str(d.claim),
    context: isObj(d.context) ? (d.context as ClaimDetails["context"]) : {},
    verdict: VERDICTS.includes(d.verdict as ClaimVerdict) ? (d.verdict as ClaimVerdict) : "insufficient",
    checkability: { score: unit(ck.score) ?? 0, strengths: strArr(ck.strengths), issues: strArr(ck.issues) },
    evidence_coverage: unit(d.evidence_coverage) ?? 0,
    source_diversity: unit(d.source_diversity),
    recency: optStr(d.recency) ?? null,
    sources,
    conflicts: strArr(d.conflicts),
    missing_evidence: strArr(d.missing_evidence),
    verification_steps: objArr(d.verification_steps).map((s) => ({ label: str(s.label), url: optStr(s.url) })),
    retrieval: d.retrieval === "live" || d.retrieval === "illustrative" ? d.retrieval : sources.length ? "live" : "none",
  };
}

function imageDetails(d: Obj): ImageDetails {
  const q = isObj(d.quality) ? d.quality : {};
  const compression = ["light", "moderate", "heavy"].includes(q.compression as string)
    ? (q.compression as ImageDetails["quality"]["compression"])
    : "unknown";
  return {
    file: fileMeta(d.file),
    exif_present: typeof d.exif_present === "boolean" ? d.exif_present : null,
    quality: { megapixels: num(q.megapixels), bytes_per_pixel: num(q.bytes_per_pixel), compression, score: unit(q.score) ?? 0.5 },
    signals: objArr(d.signals).map((s, i) => ({
      id: str(s.id, `sig-${i}`),
      label: str(s.label, "Signal"),
      value: unit(s.value) ?? 0,
      note: str(s.note),
      simulated: s.simulated === true,
    })),
    artefacts: strArr(d.artefacts),
    detector: d.detector === "simulated" ? "simulated" : "live",
  };
}

function videoDetails(d: Obj): VideoDetails {
  const s = isObj(d.sampling) ? d.sampling : {};
  const t = isObj(d.temporal) ? d.temporal : {};
  return {
    file: fileMeta(d.file),
    scenario: d.scenario === "insufficient_faces" || d.scenario === "failure" ? d.scenario : "standard",
    stage: str(d.stage, "—"),
    sampling: {
      interval_s: num(s.interval_s) ?? 1,
      frames_planned: num(s.frames_planned) ?? 0,
      frames_sampled: num(s.frames_sampled) ?? 0,
      frames_with_faces: num(s.frames_with_faces) ?? 0,
    },
    frames: objArr(d.frames).map((f) => ({ t: num(f.t) ?? 0, score: score(f.score), face: f.face !== false })),
    temporal: {
      consistency: unit(t.consistency),
      flagged_transitions: num(t.flagged_transitions) ?? 0,
      note: str(t.note),
    },
    manipulation_likelihood: unit(d.manipulation_likelihood),
    detector: d.detector === "simulated" ? "simulated" : "live",
  };
}

export function normalizeAnalysis(raw: unknown, expected?: ModuleId): AnalysisResult {
  if (!isObj(raw)) throw new ValidationError("Analysis response is not an object.");
  const mod = raw.module ?? expected;
  if (!isModuleId(mod)) throw new ValidationError(`Unknown analysis module: ${String(raw.module)}`);
  if (expected && mod !== expected) throw new ValidationError(`Expected a ${expected} result but received ${mod}.`);
  const id = str(raw.id);
  if (!id) throw new ValidationError("Analysis response is missing an id.");

  const status = STATUSES.includes(raw.status as AnalysisStatus) ? (raw.status as AnalysisStatus) : "completed";
  const details = isObj(raw.details) ? raw.details : {};
  const base = {
    id,
    status,
    title: str(raw.title, "Untitled analysis"),
    input_summary: str(raw.input_summary),
    risk_score: status === "completed" ? score(raw.risk_score) : null,
    confidence: unit(raw.confidence),
    label: str(raw.label, status === "completed" ? "Result" : status),
    reasons: strArr(raw.reasons),
    evidence: evidence(raw.evidence),
    limitations: strArr(raw.limitations),
    recommendations: strArr(raw.recommendations),
    model_version: str(raw.model_version, "unknown"),
    coverage: coverage(raw.coverage),
    data_source: raw.data_source === "demo" || raw.data_source === "sample" ? raw.data_source : "api",
    created_at: str(raw.created_at, new Date().toISOString()),
    completed_at: optStr(raw.completed_at) ?? null,
    progress: unit(raw.progress) ?? undefined,
    error: optStr(raw.error),
  } as const;

  switch (mod) {
    case "scam":
      return { ...base, module: mod, details: scamDetails(details) };
    case "claim":
      return { ...base, module: mod, details: claimDetails(details) };
    case "image":
      return { ...base, module: mod, details: imageDetails(details) };
    case "video":
      return { ...base, module: mod, details: videoDetails(details) };
  }
}

export function normalizeReport(raw: unknown): ReportResponse {
  if (!isObj(raw)) throw new ValidationError("Report response is not an object.");
  const id = str(raw.id);
  if (!id) throw new ValidationError("Report response is missing an id.");
  return {
    id,
    title: str(raw.title, "Untitled report"),
    status: raw.status === "draft" ? "draft" : "final",
    created_at: str(raw.created_at, new Date().toISOString()),
    updated_at: optStr(raw.updated_at),
    finalized_at: optStr(raw.finalized_at) ?? null,
    analyses: Array.isArray(raw.analyses) ? raw.analyses : [],
  };
}

export function normalizeReportList(raw: unknown): ReportListResponse {
  const list = isObj(raw) && Array.isArray(raw.reports) ? raw.reports : Array.isArray(raw) ? raw : null;
  if (!list) throw new ValidationError("Report list response is not in the expected format.");
  return { reports: list.map(normalizeReport) };
}

/** Lenient parse used for persisted local data — drops records that fail validation. */
export function safeNormalizeAnalyses(raw: unknown): AnalysisResult[] {
  if (!Array.isArray(raw)) return [];
  const out: AnalysisResult[] = [];
  for (const item of raw) {
    try {
      const a = normalizeAnalysis(item);
      // Locally persisted demo/sample data is trusted to keep its original source label.
      out.push(a);
    } catch {
      // skip corrupt record
    }
  }
  return out;
}
