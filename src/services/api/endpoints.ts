/** Typed wrappers for each proposed backend endpoint. */
import type { AnalysisResult } from "@/types/analysis";
import { apiRequest } from "./client";
import { API_CONFIG } from "./config";
import {
  MEDIA_UPLOAD_FIELD,
  type AnalyzeTextRequest,
  type AnalyzeUrlRequest,
  type ReportListResponse,
  type ReportResponse,
  type VerifyClaimRequest,
} from "./contracts";
import { normalizeAnalysis, normalizeReportList, normalizeReport } from "../validation";

type Opts = { signal?: AbortSignal };

function upload(file: File): FormData {
  const form = new FormData();
  form.append(MEDIA_UPLOAD_FIELD, file, file.name);
  return form;
}

export const threatDetectorApi = {
  analyzeText: async (body: AnalyzeTextRequest, o: Opts = {}): Promise<AnalysisResult> =>
    normalizeAnalysis(await apiRequest("/analyze/text", { body, signal: o.signal }), "scam"),

  analyzeUrl: async (body: AnalyzeUrlRequest, o: Opts = {}): Promise<AnalysisResult> =>
    normalizeAnalysis(await apiRequest("/analyze/url", { body, signal: o.signal }), "scam"),

  verifyClaim: async (body: VerifyClaimRequest, o: Opts = {}): Promise<AnalysisResult> =>
    normalizeAnalysis(await apiRequest("/verify/claim", { body, signal: o.signal }), "claim"),

  analyzeImage: async (file: File, o: Opts = {}): Promise<AnalysisResult> =>
    normalizeAnalysis(await apiRequest("/analyze/image", { body: upload(file), signal: o.signal, timeoutMs: API_CONFIG.timeoutMs * 2 }), "image"),

  analyzeVideo: async (file: File, o: Opts = {}): Promise<AnalysisResult> =>
    normalizeAnalysis(await apiRequest("/analyze/video", { body: upload(file), signal: o.signal, timeoutMs: API_CONFIG.timeoutMs * 4 }), "video"),

  getVideoJob: async (id: string, o: Opts = {}): Promise<AnalysisResult> =>
    normalizeAnalysis(await apiRequest(`/analyze/video/${encodeURIComponent(id)}`, { signal: o.signal }), "video"),

  listReports: async (o: Opts = {}): Promise<ReportListResponse> => normalizeReportList(await apiRequest("/reports", { signal: o.signal })),

  getReport: async (id: string, o: Opts = {}): Promise<ReportResponse> =>
    normalizeReport(await apiRequest(`/reports/${encodeURIComponent(id)}`, { signal: o.signal })),

  /** Lightweight reachability check used by Settings. */
  ping: async (): Promise<boolean> => {
    await apiRequest("/reports", { timeoutMs: 5000 });
    return true;
  },
};
