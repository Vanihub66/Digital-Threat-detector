import type { DataSource, ModuleId, RiskLevel } from "./analysis";

/** "draft" reports are still collecting analyses; "final" reports are locked. */
export type ReportStatus = "draft" | "final";

/**
 * A Digital Trust Report groups the analyses run for one investigation
 * (e.g. a suspicious post containing a message, a claim, an image and a video).
 * The unified score is computed from the referenced analyses at render time.
 */
export interface TrustReport {
  id: string;
  title: string;
  status: ReportStatus;
  analysis_ids: string[];
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  data_source: DataSource;
}

export interface ModuleContribution {
  module: ModuleId;
  analysis_id: string;
  risk_score: number;
  confidence: number;
  level: RiskLevel;
  label: string;
  /** Share of the weighted mean, 0–1. */
  weight: number;
}

export interface SkippedModule {
  module: ModuleId;
  reason: string;
}

/** Derived (never persisted) unified view of a report. */
export interface UnifiedAssessment {
  risk_score: number | null;
  level: RiskLevel | null;
  confidence: number | null;
  contributions: ModuleContribution[];
  skipped: SkippedModule[];
  pending: ModuleId[];
  inconsistencies: string[];
  coverage_ratio: number;
  coverage_statement: string;
  method: string;
}
