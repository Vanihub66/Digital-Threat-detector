import type { AnalysisResult, RiskLevel } from "@/types/analysis";
import type { ActivityPoint } from "@/components/charts/activity-chart";
import { riskLevel } from "@/lib/risk";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function activitySeries(analyses: AnalysisResult[], days = 14, now = new Date()): ActivityPoint[] {
  const points: ActivityPoint[] = [];
  const index = new Map<string, ActivityPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const p: ActivityPoint = {
      day: dayKey(d),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      analyses: 0,
      highRisk: 0,
    };
    points.push(p);
    index.set(p.day, p);
  }
  for (const a of analyses) {
    const p = index.get(dayKey(new Date(a.created_at)));
    if (!p) continue;
    p.analyses++;
    if (a.risk_score !== null && a.risk_score >= 60) p.highRisk++;
  }
  return points;
}

export function riskCounts(analyses: AnalysisResult[]) {
  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let unscored = 0;
  for (const a of analyses) {
    if (a.status === "queued" || a.status === "processing") continue;
    if (a.risk_score === null) unscored++;
    else counts[riskLevel(a.risk_score)]++;
  }
  return { counts, unscored };
}
