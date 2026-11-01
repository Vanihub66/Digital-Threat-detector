import { FileSearch, ImageIcon, Link2, Video, type LucideIcon } from "lucide-react";
import type { AnalysisStatus, ModuleId } from "@/types/analysis";

export interface ModuleMeta {
  id: ModuleId;
  name: string;
  shortName: string;
  /** Tab label used in the analysis workspace. */
  tab: string;
  description: string;
  icon: LucideIcon;
  /** Route of the module-focused workspace. */
  href: string;
  /** Proposed backend endpoint(s). */
  endpoint: string;
  accent: string;
}

export const MODULES: Record<ModuleId, ModuleMeta> = {
  scam: {
    id: "scam",
    name: "Scam & Suspicious URL Detection",
    shortName: "Scam & URL",
    tab: "Text / URL",
    description:
      "Flags urgency, impersonation, payment-pressure language and risky URL patterns in messages, emails and links.",
    icon: Link2,
    href: "/analyze/scam",
    endpoint: "POST /analyze/text · POST /analyze/url",
    accent: "text-accent",
  },
  claim: {
    id: "claim",
    name: "Claim Verification & Misinformation Evidence",
    shortName: "Claim",
    tab: "Claim",
    description:
      "Checks whether a claim is specific and checkable, then reviews supporting and contradicting evidence.",
    icon: FileSearch,
    href: "/analyze/claim",
    endpoint: "POST /verify/claim",
    accent: "text-accent-2",
  },
  image: {
    id: "image",
    name: "AI-Generated Image & Manipulation Assessment",
    shortName: "Image",
    tab: "Image",
    description:
      "Assesses synthetic-media and editing indicators alongside image quality and metadata limitations.",
    icon: ImageIcon,
    href: "/analyze/image",
    endpoint: "POST /analyze/image",
    accent: "text-ai",
  },
  video: {
    id: "video",
    name: "Video Deepfake Assessment",
    shortName: "Video",
    tab: "Video",
    description:
      "Samples frames, checks face coverage and temporal consistency, and estimates manipulation likelihood.",
    icon: Video,
    href: "/analyze/video",
    endpoint: "POST /analyze/video",
    accent: "text-ai",
  },
};

export const MODULE_IDS: ModuleId[] = ["scam", "claim", "image", "video"];

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && (MODULE_IDS as string[]).includes(value);
}

export const STATUS_META: Record<AnalysisStatus, { label: string; tone: "neutral" | "info" | "success" | "danger" | "warning" }> = {
  queued: { label: "Queued", tone: "neutral" },
  processing: { label: "Processing", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  insufficient_coverage: { label: "Insufficient coverage", tone: "warning" },
};
