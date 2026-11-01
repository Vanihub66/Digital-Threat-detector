/**
 * PROPOSED request/response contracts for the FastAPI backend.
 * These are integration targets, not confirmed live endpoints.
 *
 *   POST /analyze/text          AnalyzeTextRequest  → AnalysisResult (module "scam")
 *   POST /analyze/url           AnalyzeUrlRequest   → AnalysisResult (module "scam")
 *   POST /verify/claim          VerifyClaimRequest  → AnalysisResult (module "claim")
 *   POST /analyze/image         multipart: file     → AnalysisResult (module "image")
 *   POST /analyze/video         multipart: file     → AnalysisResult (module "video", status "queued")
 *   GET  /analyze/video/{id}    (proposed, for polling async video jobs) → AnalysisResult
 *   GET  /reports               → ReportListResponse
 *   GET  /reports/{id}          → ReportResponse
 *
 * All AnalysisResult JSON follows `src/types/analysis.ts`; risk_score is 0–100 and
 * confidence is 0–1. Responses are validated by `src/services/validation.ts`.
 */
import type { ClaimContext } from "@/types/analysis";
import type { ReportStatus } from "@/types/report";

export interface AnalyzeTextRequest {
  text: string;
  /** Optional link found alongside the message. */
  url?: string;
}

export interface AnalyzeUrlRequest {
  url: string;
}

export interface VerifyClaimRequest {
  claim: string;
  context?: ClaimContext;
}

/** Multipart field names for media uploads. */
export const MEDIA_UPLOAD_FIELD = "file";

export interface ReportResponse {
  id: string;
  title: string;
  status: ReportStatus;
  created_at: string;
  updated_at?: string;
  finalized_at?: string | null;
  analyses: unknown[];
}

export interface ReportListResponse {
  reports: ReportResponse[];
}
