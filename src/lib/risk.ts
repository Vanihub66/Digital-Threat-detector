import type { RiskLevel, SignalSeverity } from "@/types/analysis";

/** Project risk thresholds (inclusive lower bounds). */
export const RISK_THRESHOLDS: Record<RiskLevel, { min: number; max: number }> = {
  low: { min: 0, max: 29 },
  medium: { min: 30, max: 59 },
  high: { min: 60, max: 79 },
  critical: { min: 80, max: 100 },
};

export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

export function riskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

interface RiskMeta {
  label: string;
  /** Tailwind classes — complete strings so they are picked up by the compiler. */
  text: string;
  bg: string;
  border: string;
  dot: string;
  /** CSS variable for charts/SVG. */
  color: string;
  summary: string;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  low: {
    label: "Low",
    text: "text-low",
    bg: "bg-low/10",
    border: "border-low/30",
    dot: "bg-low",
    color: "var(--low)",
    summary: "Few or no risk indicators were found by the checks that ran.",
  },
  medium: {
    label: "Medium",
    text: "text-medium",
    bg: "bg-medium/10",
    border: "border-medium/30",
    dot: "bg-medium",
    color: "var(--medium)",
    summary: "Some risk indicators were found. Verify before acting.",
  },
  high: {
    label: "High",
    text: "text-high",
    bg: "bg-high/10",
    border: "border-high/30",
    dot: "bg-high",
    color: "var(--high)",
    summary: "Multiple strong risk indicators were found. Treat with caution.",
  },
  critical: {
    label: "Critical",
    text: "text-critical",
    bg: "bg-critical/10",
    border: "border-critical/30",
    dot: "bg-critical",
    color: "var(--critical)",
    summary: "Strong, converging risk indicators. Do not act on this content without independent verification.",
  },
};

export type ConfidenceBand = "low" | "moderate" | "high";

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "moderate";
  return "low";
}

export const CONFIDENCE_COPY: Record<ConfidenceBand, { label: string; detail: string }> = {
  high: { label: "High confidence", detail: "Inputs were sufficient and signals were consistent." },
  moderate: { label: "Moderate confidence", detail: "Some inputs were limited or signals were mixed." },
  low: { label: "Low confidence", detail: "Treat this result as a weak indication only." },
};

export const SEVERITY_META: Record<SignalSeverity, { label: string; text: string; bg: string; border: string }> = {
  info: { label: "Info", text: "text-info", bg: "bg-info/10", border: "border-info/30" },
  low: { label: "Low", text: "text-low", bg: "bg-low/10", border: "border-low/30" },
  medium: { label: "Medium", text: "text-medium", bg: "bg-medium/10", border: "border-medium/30" },
  high: { label: "High", text: "text-high", bg: "bg-high/10", border: "border-high/30" },
};
