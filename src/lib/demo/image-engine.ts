/**
 * Demo image engine.
 *
 * Real: file name/type/size, pixel dimensions, EXIF-block presence, and the
 * derived quality indicators (megapixels, bytes per pixel).
 * Simulated: every detector signal and the synthetic/manipulation score. They are
 * derived deterministically from the file's metadata so the same file always gives
 * the same demo output, and they are labelled "simulated" throughout the UI.
 */
import type { ImageAnalysis, ImageDetails, MediaFileMeta, TechnicalSignal } from "@/types/analysis";
import { hashString, seededRandom } from "@/lib/hash";
import { clamp, round } from "@/lib/utils";
import { riskLevel } from "@/lib/risk";

export const IMAGE_MODEL_VERSION = "demo-image-simulator-0.2.0";

export interface ImageInput {
  file: MediaFileMeta;
  exifPresent: boolean | null;
}

function assessQuality(file: MediaFileMeta): ImageDetails["quality"] {
  if (!file.width || !file.height) return { megapixels: null, bytes_per_pixel: null, compression: "unknown", score: 0.5 };
  const pixels = file.width * file.height;
  const mp = round(pixels / 1_000_000, 2);
  const bpp = round(file.size / pixels, 3);
  const lossless = /png|bmp|tiff/.test(file.type);
  const compression: ImageDetails["quality"]["compression"] = lossless
    ? "light"
    : bpp > 1.2
      ? "light"
      : bpp > 0.35
        ? "moderate"
        : "heavy";
  const resolutionFactor = clamp(mp / 1.0, 0.25, 1);
  const compressionFactor = compression === "light" ? 1 : compression === "moderate" ? 0.85 : 0.6;
  return { megapixels: mp, bytes_per_pixel: bpp, compression, score: round(resolutionFactor * compressionFactor, 2) };
}

const SIGNAL_DEFS = [
  { id: "frequency", label: "Frequency-domain irregularities", note: "Periodic patterns sometimes left by upsampling layers in image generators." },
  { id: "noise", label: "Sensor-noise consistency", note: "Camera photos usually carry a consistent sensor-noise pattern across the frame." },
  { id: "lighting", label: "Lighting & shadow coherence", note: "Checks whether light direction and shadows agree across objects." },
  { id: "edges", label: "Edge & boundary artefacts", note: "Looks for halos or blending seams around pasted or inpainted regions." },
  { id: "texture", label: "Texture repetition", note: "Repeated or overly smooth textures (skin, hair, foliage) can indicate synthesis." },
];

const ARTEFACT_OBSERVATIONS: Record<string, string> = {
  frequency: "Grid-like high-frequency pattern visible in flat regions (simulated observation).",
  noise: "Noise level differs between foreground subject and background (simulated observation).",
  lighting: "Shadow direction on the main subject does not match background objects (simulated observation).",
  edges: "Soft halo along a subject boundary consistent with compositing (simulated observation).",
  texture: "Unusually uniform texture in hair or fabric regions (simulated observation).",
};

const LABELS = {
  low: "Few manipulation indicators",
  medium: "Some manipulation indicators",
  high: "Notable manipulation indicators",
  critical: "Strong manipulation indicators",
} as const;

export function analyzeImageDemo(input: ImageInput, opts: { id: string; createdAt: string; source?: "demo" | "sample" }): ImageAnalysis {
  const { file } = input;
  const rand = seededRandom(hashString(`${file.name}|${file.size}|${file.width}x${file.height}`));
  const base = 0.12 + rand() * 0.72;
  const signals: TechnicalSignal[] = SIGNAL_DEFS.map((d) => ({
    ...d,
    value: round(clamp(base + (rand() - 0.5) * 0.45, 0.02, 0.98), 2),
    simulated: true,
  }));
  const quality = assessQuality(file);
  const meanSignal = signals.reduce((s, x) => s + x.value, 0) / signals.length;
  const risk = Math.round(clamp(meanSignal * 100, 0, 100));
  const level = riskLevel(risk);
  const confidence = round(clamp(0.3 + quality.score * 0.4, 0.2, 0.7), 2);

  const strong = [...signals].sort((a, b) => b.value - a.value).filter((s) => s.value >= 0.55);
  const artefacts = strong.slice(0, 3).map((s) => ARTEFACT_OBSERVATIONS[s.id]);

  const limitations = [
    "SIMULATED: no image-forensics or synthetic-media detector ran. Scores are deterministic placeholders derived from file metadata.",
    "Compression, resizing, screenshots and filters can hide or mimic manipulation artefacts.",
    "Detectors generalise poorly to image generators they were not trained on.",
    "A low score does not prove an image is authentic; a high score does not prove it is fake.",
  ];
  if (quality.compression === "heavy") limitations.push("Heavy compression detected — fine-grained signals are less reliable.");
  if (quality.megapixels !== null && quality.megapixels < 0.3) limitations.push("Low resolution — many forensic signals need more pixels.");
  if (input.exifPresent === false)
    limitations.push("No EXIF metadata found. This is common (most platforms strip it) and is not evidence of manipulation.");

  const recommendations =
    level === "low"
      ? ["Still check the image's original source and context before relying on it."]
      : [
          "Run a reverse image search to find earlier or original versions.",
          "Check the original uploader, date and location against the claimed context.",
          "Look for the same scene from independent sources or angles.",
        ];
  recommendations.push("Treat this result as one input among several — not as proof.");

  return {
    id: opts.id,
    module: "image",
    status: "completed",
    title: file.name,
    input_summary: `${file.type || "image"} · ${file.width ?? "?"}×${file.height ?? "?"}`,
    risk_score: risk,
    confidence,
    label: LABELS[level],
    reasons: strong.length
      ? strong.slice(0, 3).map((s) => `${s.label} (simulated strength ${Math.round(s.value * 100)}%)`)
      : ["No simulated signal exceeded the attention threshold."],
    evidence: signals.map((s) => ({
      id: s.id,
      title: s.label,
      detail: `${s.note} Simulated strength: ${Math.round(s.value * 100)}%.`,
      severity: s.value >= 0.7 ? "high" : s.value >= 0.45 ? "medium" : "low",
    })),
    limitations,
    recommendations,
    model_version: IMAGE_MODEL_VERSION,
    coverage: {
      ratio: 0.4,
      assessed: ["File metadata (real)", "EXIF block presence (real)", "Image quality indicators (real)", "Detector signals (simulated)"],
      not_assessed: ["Trained synthetic-image detector", "Region-level manipulation localisation", "Reverse image search", "C2PA / content credentials"],
      note: "Detector output is simulated in demo mode.",
    },
    data_source: opts.source ?? "demo",
    created_at: opts.createdAt,
    completed_at: opts.createdAt,
    details: {
      file,
      exif_present: input.exifPresent,
      quality,
      signals,
      artefacts,
      detector: "simulated",
    },
  };
}
