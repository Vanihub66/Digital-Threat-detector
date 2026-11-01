import { API_CONFIG } from "./config";

export type ApiErrorKind = "network" | "timeout" | "http" | "invalid_response" | "aborted";

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Errors where falling back to the labelled demo workflow makes sense. */
  get isUnavailable(): boolean {
    return this.kind === "network" || this.kind === "timeout" || (this.kind === "http" && (this.status ?? 0) >= 500);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  /** Plain objects are sent as JSON; FormData is sent as multipart. */
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Thin fetch wrapper: base URL, timeout, JSON handling and typed errors. */
export async function apiRequest(path: string, opts: RequestOptions = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = opts.timeoutMs ?? API_CONFIG.timeoutMs;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: { Accept: "application/json", ...(opts.body && !isForm ? { "Content-Type": "application/json" } : {}) },
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError("invalid_response", "The server returned a response that is not valid JSON.", res.status);
      }
    }
    if (!res.ok) {
      const detail =
        data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : res.statusText;
      throw new ApiError("http", `Request failed (${res.status}): ${detail || "Unknown error"}`, res.status);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      if (timedOut) throw new ApiError("timeout", `The server did not respond within ${Math.round(timeout / 1000)} s.`);
      throw new ApiError("aborted", "The request was cancelled.");
    }
    throw new ApiError("network", "Could not reach the ThreatDetector API. Is the backend running?");
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}
