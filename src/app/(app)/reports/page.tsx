import type { Metadata } from "next";
import { ReportsHistory } from "@/features/reports/reports-history";

export const metadata: Metadata = { title: "Reports History" };

export default function ReportsPage() {
  return <ReportsHistory />;
}
