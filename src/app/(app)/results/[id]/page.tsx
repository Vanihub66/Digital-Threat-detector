import type { Metadata } from "next";
import { ResultView } from "@/features/analysis/result-view";

export const metadata: Metadata = { title: "Analysis Result" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultView id={decodeURIComponent(id)} />;
}
