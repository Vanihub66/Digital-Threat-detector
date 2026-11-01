import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnalysisWorkspace } from "@/features/analysis/analysis-workspace";
import { isModuleId, MODULE_IDS, MODULES } from "@/lib/modules";

export function generateStaticParams() {
  return MODULE_IDS.map((module) => ({ module }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const { module } = await params;
  return { title: isModuleId(module) ? MODULES[module].shortName : "Analysis" };
}

export default async function ModuleAnalyzePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!isModuleId(module)) notFound();
  return <AnalysisWorkspace key={module} initialModule={module} syncUrl />;
}
