/**
 * Runtime API configuration, read from NEXT_PUBLIC_* environment variables.
 * Only non-secret values belong here — they are embedded in the browser bundle.
 */
export type ApiMode = "demo" | "api";

function parseTimeout(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1000 ? n : 20_000;
}

export const API_CONFIG = {
  mode: (process.env.NEXT_PUBLIC_THREATDETECTOR_MODE === "api" ? "api" : "demo") as ApiMode,
  baseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, ""),
  timeoutMs: parseTimeout(process.env.NEXT_PUBLIC_API_TIMEOUT_MS),
};
