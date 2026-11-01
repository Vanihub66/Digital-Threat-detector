/**
 * ThreatDetector AI — common analysis data contract.
 *
 * Every module (scam/URL, claim, image, video) returns an `AnalysisResult` with
 * the same top-level shape so the dashboard, history and unified report can treat
 * them uniformly. Module-specific data lives in `details`.
 *
 * Backend teammates: the snake_case fields mirror the JSON a FastAPI service should
 * return. See `src/services/api/contracts.ts` for request payloads and
 * `src/services/validation.ts` for how incoming JSON is validated.
 */

export type ModuleId = "scam" | "claim" | "image" | "video";

/** Lifecycle of a single analysis job. */
export type AnalysisStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "insufficient_coverage";

/** Risk bands — Low 0–29, Medium 30–59, High 60–79, Critical 80–100. */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Where a result came from.
 * - `api`    — returned by a real backend
 * - `demo`   — produced in-browser by the labelled demo engines
 * - `sample` — pre-seeded sample record shown so the UI is not empty
 */
export type DataSource = "api" | "demo" | "sample";

export type SignalSeverity = "info" | "low" | "medium" | "high";

/** A single piece of evidence or a signal supporting the result. */
export interface EvidenceItem {
  id: string;
  title: string;
  detail: string;
  severity: SignalSeverity;
  category?: string;
  /** Short matched excerpt (never the full raw input). */
  snippet?: string;
}

/** What the analysis actually looked at — and what it did not. */
export interface AnalysisCoverage {
  /** 0–1 fraction of the intended checks that ran. */
  ratio: number;
  assessed: string[];
  not_assessed: string[];
  note?: string;
}

export interface MediaFileMeta {
  name: string;
  type: string;
  size: number;
  last_modified?: string;
  width?: number;
  height?: number;
  /** Seconds, video only. */
  duration?: number;
}

/* ------------------------------------------------------------------ */
/* Module details                                                      */
/* ------------------------------------------------------------------ */

export type ScamSignalCategory =
  | "urgency"
  | "impersonation"
  | "payment"
  | "credentials"
  | "threat"
  | "too_good_to_be_true"
  | "url";

export interface SignalHit {
  id: string;
  label: string;
  category: ScamSignalCategory;
  /** Contribution to the score, 0–100 scale before capping. */
  weight: number;
  severity: SignalSeverity;
  explanation: string;
  matches: string[];
}

export interface UrlInspection {
  raw_host: string;
  protocol: string;
  tld: string;
  subdomain_count: number;
  path_length: number;
  is_ip_host: boolean;
  is_punycode: boolean;
  has_non_ascii: boolean;
}

export interface ScamDetails {
  input_kind: "text" | "url" | "text_and_url";
  char_count: number;
  url_count: number;
  url?: UrlInspection;
  language_signals: SignalHit[];
  url_signals: SignalHit[];
  /** Live reputation lookups only happen when a backend provides them. */
  reputation_lookup: "not_performed" | "performed";
}

export type ClaimVerdict =
  | "supports"
  | "contradicts"
  | "mixed"
  | "insufficient"
  | "needs_clarification";

export type SourceStance = "supports" | "contradicts" | "neutral";

export interface SourceItem {
  id: string;
  publisher: string;
  title: string;
  date: string | null;
  excerpt: string;
  stance: SourceStance;
  /** 0–1 */
  relevance: number;
  /** Only present for real, retrieved sources. */
  url?: string;
  /** True for illustrative demo sources that were NOT retrieved. */
  illustrative: boolean;
}

export interface ClaimContext {
  date?: string;
  location?: string;
  entities?: string;
  notes?: string;
}

export interface VerificationStep {
  label: string;
  url?: string;
}

export interface ClaimDetails {
  claim: string;
  context: ClaimContext;
  verdict: ClaimVerdict;
  checkability: { score: number; strengths: string[]; issues: string[] };
  /** 0–1 share of the claim's checkable parts covered by evidence. */
  evidence_coverage: number;
  /** 0–1, null when no sources. */
  source_diversity: number | null;
  recency: string | null;
  sources: SourceItem[];
  conflicts: string[];
  missing_evidence: string[];
  verification_steps: VerificationStep[];
  retrieval: "live" | "illustrative" | "none";
}

export interface TechnicalSignal {
  id: string;
  label: string;
  /** 0–1 strength of the signal towards manipulation/synthesis. */
  value: number;
  note: string;
  simulated: boolean;
}

export interface ImageDetails {
  file: MediaFileMeta;
  /** Whether an EXIF block was found in the file header (JPEG only). null = not checked. */
  exif_present: boolean | null;
  quality: {
    megapixels: number | null;
    bytes_per_pixel: number | null;
    compression: "light" | "moderate" | "heavy" | "unknown";
    /** 0–1 how suitable the image is for analysis. */
    score: number;
  };
  signals: TechnicalSignal[];
  artefacts: string[];
  detector: "live" | "simulated";
}

export type VideoScenario = "standard" | "insufficient_faces" | "failure";

export interface FrameResult {
  /** Timestamp in seconds. */
  t: number;
  /** 0–100 manipulation score for the frame, null when no face was found. */
  score: number | null;
  face: boolean;
}

export interface VideoDetails {
  file: MediaFileMeta;
  scenario: VideoScenario;
  stage: string;
  sampling: {
    interval_s: number;
    frames_planned: number;
    frames_sampled: number;
    frames_with_faces: number;
  };
  frames: FrameResult[];
  temporal: { consistency: number | null; flagged_transitions: number; note: string };
  /** 0–1, null when coverage was insufficient. */
  manipulation_likelihood: number | null;
  detector: "live" | "simulated";
}

/* ------------------------------------------------------------------ */
/* Result union                                                        */
/* ------------------------------------------------------------------ */

interface AnalysisResultBase<M extends ModuleId, D> {
  id: string;
  module: M;
  status: AnalysisStatus;
  title: string;
  /** Short, non-sensitive description of the input (no raw message bodies). */
  input_summary: string;
  /** 0–100, null when the module could not produce a valid score. */
  risk_score: number | null;
  /** 0–1 reliability indicator, null when not applicable. */
  confidence: number | null;
  label: string;
  reasons: string[];
  evidence: EvidenceItem[];
  limitations: string[];
  recommendations: string[];
  model_version: string;
  coverage: AnalysisCoverage;
  data_source: DataSource;
  created_at: string;
  completed_at: string | null;
  /** 0–1 while queued/processing. */
  progress?: number;
  error?: string;
  details: D;
}

export type ScamAnalysis = AnalysisResultBase<"scam", ScamDetails>;
export type ClaimAnalysis = AnalysisResultBase<"claim", ClaimDetails>;
export type ImageAnalysis = AnalysisResultBase<"image", ImageDetails>;
export type VideoAnalysis = AnalysisResultBase<"video", VideoDetails>;

export type AnalysisResult = ScamAnalysis | ClaimAnalysis | ImageAnalysis | VideoAnalysis;

export type AnalysisOf<M extends ModuleId> = Extract<AnalysisResult, { module: M }>;
