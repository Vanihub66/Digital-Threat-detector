/**
 * Unified Digital Trust score.
 *
 * Only completed analyses with a valid score contribute. Modules that failed,
 * lacked coverage, could not be scored, or were never run are listed separately
 * and are NEVER treated as "low risk".
 *
 * score = max( confidence-weighted mean of module scores,
 *              0.85 × highest module score )
 * The second term stops one strong finding from being diluted by benign modules.
 */
import type { AnalysisResult, ModuleId } from "@/types/analysis";
import type { ModuleContribution, SkippedModule, UnifiedAssessment } from "@/types/report";
import { MODULES, MODULE_IDS } from "@/lib/modules";
import { riskLevel } from "@/lib/risk";
import { clamp, round } from "@/lib/utils";

export const UNIFIED_METHOD =
  "Confidence-weighted mean of valid module scores, raised to at least 85% of the highest module score so a single strong finding is not diluted. Missing, failed and unscored modules are excluded — never counted as low risk.";

function skipReason(a: AnalysisResult): string | null {
  switch (a.status) {
    case "failed":
      return a.error ?? "Analysis failed.";
    case "insufficient_coverage":
      return "Insufficient coverage — no score produced.";
    case "queued":
    case "processing":
      return null;
    case "completed":
      if (a.risk_score === null) return `${a.label} — no risk score produced.`;
      return null;
  }
}

export function computeUnified(analyses: AnalysisResult[]): UnifiedAssessment {
  // Use the most recent analysis per module.
  const latest = new Map<ModuleId, AnalysisResult>();
  for (const a of [...analyses].sort((x, y) => x.created_at.localeCompare(y.created_at))) latest.set(a.module, a);

  const valid: AnalysisResult[] = [];
  const skipped: SkippedModule[] = [];
  const pending: ModuleId[] = [];
  for (const id of MODULE_IDS) {
    const a = latest.get(id);
    if (!a) {
      skipped.push({ module: id, reason: "Not submitted for this report." });
      continue;
    }
    if (a.status === "queued" || a.status === "processing") {
      pending.push(id);
      continue;
    }
    const reason = skipReason(a);
    if (reason) skipped.push({ module: id, reason });
    else valid.push(a);
  }

  if (valid.length === 0) {
    return {
      risk_score: null,
      level: null,
      confidence: null,
      contributions: [],
      skipped,
      pending,
      inconsistencies: [],
      coverage_ratio: 0,
      coverage_statement:
        pending.length > 0
          ? "No module has finished yet. The unified score will appear once at least one module completes."
          : "No module produced a valid score, so no unified score is shown.",
      method: UNIFIED_METHOD,
    };
  }

  const weights = valid.map((a) => Math.max(0.05, a.confidence ?? 0.3));
  const totalW = weights.reduce((s, w) => s + w, 0);
  const mean = valid.reduce((s, a, i) => s + (a.risk_score ?? 0) * weights[i], 0) / totalW;
  const max = Math.max(...valid.map((a) => a.risk_score ?? 0));
  const score = Math.round(clamp(Math.max(mean, 0.85 * max), 0, 100));

  const contributions: ModuleContribution[] = valid.map((a, i) => ({
    module: a.module,
    analysis_id: a.id,
    risk_score: a.risk_score ?? 0,
    confidence: a.confidence ?? 0.3,
    level: riskLevel(a.risk_score ?? 0),
    label: a.label,
    weight: round(weights[i] / totalW, 3),
  }));

  const coverageRatio = valid.length / MODULE_IDS.length;
  const avgConf = weights.reduce((s, w) => s + w, 0) / weights.length;
  // Confidence is reduced when fewer modules contribute.
  const confidence = round(clamp(avgConf * (0.6 + 0.4 * coverageRatio), 0, 1), 2);

  const inconsistencies: string[] = [];
  const sorted = [...contributions].sort((a, b) => b.risk_score - a.risk_score);
  if (sorted.length >= 2 && sorted[0].risk_score - sorted[sorted.length - 1].risk_score >= 40) {
    const hi = sorted[0];
    const lo = sorted[sorted.length - 1];
    inconsistencies.push(
      `${MODULES[hi.module].shortName} (${hi.risk_score}) and ${MODULES[lo.module].shortName} (${lo.risk_score}) disagree strongly. Mixed signals across content types deserve manual review — e.g. an authentic image re-used with a misleading message.`,
    );
  }
  const claim = latest.get("claim");
  if (claim?.module === "claim" && claim.details.verdict === "contradicts") {
    const media = contributions.filter((c) => (c.module === "image" || c.module === "video") && c.risk_score < 30);
    if (media.length > 0)
      inconsistencies.push(
        "Evidence contradicts the claim while the attached media shows few manipulation indicators — the media may be authentic but used out of context.",
      );
  }
  const lowConf = contributions.filter((c) => c.confidence < 0.4);
  if (lowConf.length > 0)
    inconsistencies.push(
      `${lowConf.map((c) => MODULES[c.module].shortName).join(", ")} returned low-confidence results; weigh ${lowConf.length > 1 ? "them" : "it"} cautiously.`,
    );

  const names = (ids: ModuleId[]) => ids.map((m) => MODULES[m].shortName).join(", ");
  const statement =
    `Based on ${valid.length} of ${MODULE_IDS.length} modules (${names(valid.map((a) => a.module))}).` +
    (skipped.length ? ` Not included: ${names(skipped.map((s) => s.module))}.` : "") +
    (pending.length ? ` Still processing: ${names(pending)}.` : "") +
    " The score only reflects the modules that produced valid results.";

  return {
    risk_score: score,
    level: riskLevel(score),
    confidence,
    contributions,
    skipped,
    pending,
    inconsistencies,
    coverage_ratio: round(coverageRatio, 2),
    coverage_statement: statement,
    method: UNIFIED_METHOD,
  };
}
