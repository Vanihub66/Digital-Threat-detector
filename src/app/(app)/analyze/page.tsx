import type { Metadata } from "next";
import { AnalysisWorkspace } from "@/features/analysis/analysis-workspace";

export const metadata: Metadata = { title: "New Analysis" };

export default function AnalyzePage() {
  return <AnalysisWorkspace />;
}
