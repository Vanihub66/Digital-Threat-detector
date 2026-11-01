import type { Metadata } from "next";
import { TrustReportView } from "@/features/reports/trust-report";

export const metadata: Metadata = { title: "Digital Trust Report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrustReportView id={decodeURIComponent(id)} />;
}
