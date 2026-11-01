/**
 * Sample records shown on first launch so the dashboard and history are not empty.
 * Every record is marked `data_source: "sample"` and labelled as sample data in the UI.
 * They are produced by the same demo engines used for live demo analyses.
 */
import type { AnalysisResult, MediaFileMeta, VideoScenario } from "@/types/analysis";
import type { TrustReport } from "@/types/report";
import { analyzeScamDemo } from "./scam-engine";
import { analyzeClaimDemo, CLAIM_EXAMPLES } from "./claim-engine";
import { analyzeImageDemo } from "./image-engine";
import { completeVideoDemo, createVideoJob } from "./video-engine";
import { SCAM_EXAMPLES } from "./examples";

type Spec =
  | { kind: "scam"; example: string }
  | { kind: "claim"; example: string }
  | { kind: "image"; file: MediaFileMeta; exif: boolean | null }
  | { kind: "video"; file: MediaFileMeta; scenario: VideoScenario };

interface ReportSpec {
  title: string;
  daysAgo: number;
  hour: number;
  items: Spec[];
}

const REPORTS: ReportSpec[] = [
  { title: "Bank suspension SMS", daysAgo: 0, hour: 9, items: [{ kind: "scam", example: "bank-phish" }] },
  {
    title: "Wellness post with photo",
    daysAgo: 1,
    hour: 14,
    items: [
      { kind: "claim", example: "lemon-water" },
      { kind: "image", file: { name: "wellness-post.jpg", type: "image/jpeg", size: 284_000, width: 1080, height: 1350 }, exif: false },
    ],
  },
  {
    title: "Metro opening video clip",
    daysAgo: 2,
    hour: 11,
    items: [
      { kind: "claim", example: "riverton-metro" },
      { kind: "video", file: { name: "metro-opening-clip.mp4", type: "video/mp4", size: 18_400_000, width: 1280, height: 720, duration: 42 }, scenario: "standard" },
    ],
  },
  { title: "Prize giveaway message", daysAgo: 3, hour: 16, items: [{ kind: "scam", example: "prize" }] },
  {
    title: "Impersonation profile check",
    daysAgo: 5,
    hour: 10,
    items: [
      { kind: "scam", example: "lookalike" },
      { kind: "image", file: { name: "profile-photo.png", type: "image/png", size: 1_920_000, width: 1024, height: 1024 }, exif: null },
      { kind: "video", file: { name: "profile-intro.webm", type: "video/webm", size: 6_200_000, width: 720, height: 1280, duration: 18 }, scenario: "insufficient_faces" },
    ],
  },
  { title: "Hygiene guidance claim", daysAgo: 6, hour: 13, items: [{ kind: "claim", example: "handwashing" }] },
  { title: "Group project email", daysAgo: 8, hour: 15, items: [{ kind: "scam", example: "benign" }] },
  {
    title: "Interview recording",
    daysAgo: 9,
    hour: 12,
    items: [{ kind: "video", file: { name: "interview-recording.mov", type: "video/quicktime", size: 52_000_000, width: 1920, height: 1080, duration: 95 }, scenario: "failure" }],
  },
  {
    title: "Viral transit post (full check)",
    daysAgo: 11,
    hour: 17,
    items: [
      { kind: "scam", example: "prize" },
      { kind: "claim", example: "riverton-metro" },
      { kind: "image", file: { name: "transit-screenshot.jpg", type: "image/jpeg", size: 96_000, width: 720, height: 1280 }, exif: false },
      { kind: "video", file: { name: "transit-news.mp4", type: "video/mp4", size: 24_000_000, width: 1280, height: 720, duration: 60 }, scenario: "standard" },
    ],
  },
  { title: "Vague policy rumour", daysAgo: 12, hour: 9, items: [{ kind: "claim", example: "vague" }] },
];

function build(spec: Spec, id: string, createdAt: string): AnalysisResult {
  const opts = { id, createdAt, source: "sample" as const };
  switch (spec.kind) {
    case "scam": {
      const ex = SCAM_EXAMPLES.find((e) => e.key === spec.example) ?? SCAM_EXAMPLES[0];
      return analyzeScamDemo({ text: ex.text, url: ex.url }, opts);
    }
    case "claim": {
      const ex = CLAIM_EXAMPLES.find((e) => e.key === spec.example) ?? CLAIM_EXAMPLES[0];
      return analyzeClaimDemo({ claim: ex.claim, context: ex.context }, opts);
    }
    case "image":
      return analyzeImageDemo({ file: spec.file, exifPresent: spec.exif }, opts);
    case "video":
      return completeVideoDemo(createVideoJob(spec.file, spec.scenario, opts));
  }
}

export function buildSampleData(now: number = Date.now()): { analyses: AnalysisResult[]; reports: TrustReport[] } {
  const analyses: AnalysisResult[] = [];
  const reports: TrustReport[] = [];
  REPORTS.forEach((r, ri) => {
    const day = new Date(now - r.daysAgo * 86_400_000);
    day.setHours(r.hour, 0, 0, 0);
    // Keep "today" samples in the past.
    const start = Math.min(day.getTime(), now - 3_600_000);
    const ids: string[] = [];
    r.items.forEach((item, i) => {
      const id = `SMP-${String(ri + 1).padStart(2, "0")}${String.fromCharCode(65 + i)}`;
      analyses.push(build(item, id, new Date(start + i * 4 * 60_000).toISOString()));
      ids.push(id);
    });
    const created = new Date(start).toISOString();
    const finalized = new Date(start + r.items.length * 4 * 60_000 + 60_000).toISOString();
    reports.push({
      id: `TR-SAMPLE${String(ri + 1).padStart(2, "0")}`,
      title: r.title,
      status: "final",
      analysis_ids: ids,
      created_at: created,
      updated_at: finalized,
      finalized_at: finalized,
      data_source: "sample",
    });
  });
  return { analyses, reports };
}
