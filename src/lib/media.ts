/** Browser-only helpers for reading real file metadata and building sample media. */
import type { MediaFileMeta } from "@/types/analysis";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function baseMeta(file: File): MediaFileMeta {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    last_modified: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
  };
}

export function validateMedia(file: File, kind: "image" | "video"): string | null {
  const types = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (!types.includes(file.type)) {
    return kind === "image"
      ? "Unsupported image type. Please use JPEG, PNG or WebP."
      : "Unsupported video type. Please use MP4, WebM or MOV.";
  }
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > max) return `File is too large. Maximum size is ${Math.round(max / 1024 / 1024)} MB.`;
  return null;
}

export function readImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function readVideoMeta(url: string): Promise<{ width: number; height: number; duration: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (value: { width: number; height: number; duration: number } | null) => {
      v.removeAttribute("src");
      v.load();
      resolve(value);
    };
    v.onloadedmetadata = () =>
      done({ width: v.videoWidth, height: v.videoHeight, duration: Number.isFinite(v.duration) ? v.duration : 0 });
    v.onerror = () => done(null);
    v.src = url;
  });
}

/**
 * Checks the JPEG header for an APP1 "Exif" segment. Returns null for formats
 * where we do not check (PNG/WebP), true/false for JPEG.
 */
export async function detectExif(file: File): Promise<boolean | null> {
  if (file.type !== "image/jpeg") return null;
  const buf = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const len = (buf[i + 2] << 8) | buf[i + 3];
    if (marker === 0xe1 && buf[i + 4] === 0x45 && buf[i + 5] === 0x78 && buf[i + 6] === 0x69 && buf[i + 7] === 0x66) return true;
    if (marker === 0xda) break; // start of scan — no more metadata segments
    i += 2 + len;
  }
  return false;
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0b1530");
  g.addColorStop(1, "#123a5a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.fillStyle = `hsla(${190 + i * 14}, 80%, ${55 + i * 3}%, 0.35)`;
    const x = w * (0.15 + 0.14 * i) + Math.sin(t + i) * 20;
    const y = h * 0.5 + Math.cos(t * 1.3 + i) * h * 0.2;
    ctx.arc(x, y, 40 + i * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 ${Math.round(h / 14)}px system-ui, sans-serif`;
  ctx.fillText("ThreatDetector sample media", w * 0.06, h * 0.14);
  ctx.font = `${Math.round(h / 24)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("Generated in your browser for the demo", w * 0.06, h * 0.22);
}

/** Generates a sample PNG locally (no network). */
export async function generateSampleImage(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  drawScene(ctx, canvas.width, canvas.height, 0.6);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not generate the sample image.");
  return new File([blob], "sample-generated-image.png", { type: "image/png", lastModified: Date.now() });
}

/** Records a short WebM clip from an animated canvas (no network). */
export async function generateSampleVideo(seconds = 4): Promise<File> {
  if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot record a sample video.");
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error("This browser cannot record WebM video.");
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (recorder.onstop = () => r()));
  const start = performance.now();
  let raf = 0;
  const loop = () => {
    drawScene(ctx, canvas.width, canvas.height, (performance.now() - start) / 500);
    raf = requestAnimationFrame(loop);
  };
  loop();
  recorder.start(250);
  await new Promise((r) => setTimeout(r, seconds * 1000));
  recorder.stop();
  await stopped;
  cancelAnimationFrame(raf);
  stream.getTracks().forEach((t) => t.stop());
  return new File([new Blob(chunks, { type: "video/webm" })], "sample-generated-clip.webm", { type: "video/webm", lastModified: Date.now() });
}
