"use client";

/**
 * Local demo store.
 *
 * Holds analyses, reports, preferences and notifications in memory and persists
 * them to this browser's localStorage. Raw messages and uploaded media are never
 * persisted — only derived results (see `lib/session-cache.ts`).
 *
 * When a real backend with accounts exists, replace the persistence functions
 * with API calls; components only use the hooks and `actions` exported here.
 */
import { useSyncExternalStore } from "react";
import type { AnalysisResult } from "@/types/analysis";
import type { TrustReport } from "@/types/report";
import { buildSampleData } from "@/lib/demo/seed";
import { sessionCache } from "@/lib/session-cache";
import { createId } from "@/lib/utils";
import { MODULES } from "@/lib/modules";
import { safeNormalizeAnalyses } from "@/services/validation";

export type ThemePreference = "dark" | "light" | "system";

export interface Preferences {
  theme: ThemePreference;
  reducedMotion: boolean;
  compactTables: boolean;
  sidebarCollapsed: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  href?: string;
  tone: "info" | "success" | "warning" | "danger";
  created_at: string;
  read: boolean;
}

interface PersistedState {
  version: 1;
  analyses: AnalysisResult[];
  reports: TrustReport[];
  activeReportId: string | null;
  preferences: Preferences;
  notifications: AppNotification[];
}

export interface AppState extends PersistedState {
  hydrated: boolean;
}

const STORAGE_KEY = "threatdetector.demo.v1";

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  reducedMotion: false,
  compactTables: false,
  sidebarCollapsed: false,
};

const SERVER_STATE: AppState = {
  version: 1,
  analyses: [],
  reports: [],
  activeReportId: null,
  preferences: DEFAULT_PREFERENCES,
  notifications: [],
  hydrated: false,
};

let state: AppState = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function welcomeNotification(): AppNotification {
  return {
    id: createId("NT"),
    title: "Sample data loaded",
    body: "The dashboard and history contain clearly-labelled sample records. Reset them any time in Settings.",
    href: "/settings",
    tone: "info",
    created_at: new Date().toISOString(),
    read: false,
  };
}

function freshState(withSamples: boolean): AppState {
  const sample = withSamples ? buildSampleData() : { analyses: [], reports: [] };
  return {
    version: 1,
    analyses: sample.analyses,
    reports: sample.reports,
    activeReportId: null,
    preferences: state.preferences ?? DEFAULT_PREFERENCES,
    notifications: withSamples ? [welcomeNotification()] : [],
    hydrated: true,
  };
}

function readStorage(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1) return null;
    return {
      version: 1,
      analyses: safeNormalizeAnalyses(parsed.analyses),
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      activeReportId: typeof parsed.activeReportId === "string" ? parsed.activeReportId : null,
      preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences ?? {}) },
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications.slice(0, 30) : [],
      hydrated: true,
    };
  } catch {
    return null;
  }
}

function writeStorage(s: AppState) {
  try {
    const persisted: PersistedState = {
      version: 1,
      analyses: s.analyses,
      reports: s.reports,
      activeReportId: s.activeReportId,
      preferences: s.preferences,
      notifications: s.notifications.slice(0, 30),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage full or unavailable (private mode) — keep working in memory.
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = readStorage() ?? freshState(true);
  writeStorage(state);
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const next = readStorage();
    if (next) {
      state = next;
      listeners.forEach((l) => l());
    }
  });
}

function setState(updater: (s: AppState) => AppState) {
  ensureLoaded();
  state = updater(state);
  writeStorage(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppState {
  ensureLoaded();
  return state;
}

function getServerSnapshot(): AppState {
  return SERVER_STATE;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getAppState(): AppState {
  return getSnapshot();
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function findReportForAnalysis(s: AppState, analysisId: string): TrustReport | undefined {
  return s.reports.find((r) => r.analysis_ids.includes(analysisId));
}

export function analysesForReport(s: AppState, report: TrustReport): AnalysisResult[] {
  return report.analysis_ids.map((id) => s.analyses.find((a) => a.id === id)).filter((a): a is AnalysisResult => Boolean(a));
}

export function activeDraft(s: AppState): TrustReport | undefined {
  return s.reports.find((r) => r.id === s.activeReportId && r.status === "draft");
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function notify(s: AppState, n: Omit<AppNotification, "id" | "created_at" | "read">): AppState {
  const item: AppNotification = { ...n, id: createId("NT"), created_at: new Date().toISOString(), read: false };
  return { ...s, notifications: [item, ...s.notifications].slice(0, 30) };
}

export const actions = {
  /** Adds an analysis to the active draft report (creating one if needed). Returns the report id. */
  addAnalysis(result: AnalysisResult): string {
    let reportId = "";
    setState((s) => {
      const now = new Date().toISOString();
      let reports = s.reports;
      let analyses = [result, ...s.analyses];
      let draft = activeDraft(s);
      if (!draft) {
        draft = {
          id: createId("TR"),
          title: `${MODULES[result.module].shortName} check — ${result.title}`.slice(0, 80),
          status: "draft",
          analysis_ids: [],
          created_at: now,
          updated_at: now,
          finalized_at: null,
          data_source: result.data_source,
        };
        reports = [draft, ...reports];
      }
      // One analysis per module per report: a newer run replaces the older one.
      const replaced = draft.analysis_ids.filter((id) => s.analyses.find((a) => a.id === id)?.module === result.module);
      replaced.forEach((id) => sessionCache.forget(id));
      analyses = analyses.filter((a) => !replaced.includes(a.id));
      const updated: TrustReport = {
        ...draft,
        analysis_ids: [...draft.analysis_ids.filter((id) => !replaced.includes(id)), result.id],
        updated_at: now,
        data_source: draft.data_source === "api" || result.data_source === "api" ? "api" : "demo",
      };
      reportId = updated.id;
      let next: AppState = {
        ...s,
        analyses,
        reports: reports.map((r) => (r.id === updated.id ? updated : r)),
        activeReportId: updated.id,
      };
      if (result.status === "completed" || result.status === "insufficient_coverage") {
        next = notify(next, {
          title: `${MODULES[result.module].shortName} analysis complete`,
          body: `${result.label}${result.data_source === "demo" ? " (demo output)" : ""}.`,
          href: `/results/${result.id}`,
          tone: "success",
        });
      }
      return next;
    });
    return reportId;
  },

  updateAnalysis(result: AnalysisResult) {
    setState((s) => {
      const prev = s.analyses.find((a) => a.id === result.id);
      if (!prev) return s;
      let next: AppState = { ...s, analyses: s.analyses.map((a) => (a.id === result.id ? result : a)) };
      const wasRunning = prev.status === "queued" || prev.status === "processing";
      const isDone = result.status !== "queued" && result.status !== "processing";
      if (wasRunning && isDone) {
        next = notify(next, {
          title:
            result.status === "failed"
              ? "Video analysis failed"
              : result.status === "insufficient_coverage"
                ? "Video analysis: insufficient coverage"
                : "Video analysis complete",
          body: result.status === "completed" ? `${result.label} (${result.data_source === "demo" ? "simulated" : "backend"}).` : result.label,
          href: `/results/${result.id}`,
          tone: result.status === "failed" ? "danger" : result.status === "insufficient_coverage" ? "warning" : "success",
        });
      }
      return next;
    });
  },

  startNewReport() {
    setState((s) => ({ ...s, activeReportId: null }));
  },

  setActiveReport(id: string) {
    setState((s) => ({ ...s, activeReportId: s.reports.some((r) => r.id === id && r.status === "draft") ? id : s.activeReportId }));
  },

  renameReport(id: string, title: string) {
    const t = title.trim().slice(0, 100);
    if (!t) return;
    setState((s) => ({ ...s, reports: s.reports.map((r) => (r.id === id ? { ...r, title: t, updated_at: new Date().toISOString() } : r)) }));
  },

  finalizeReport(id: string) {
    setState((s) => {
      const now = new Date().toISOString();
      return notify(
        {
          ...s,
          reports: s.reports.map((r) => (r.id === id ? { ...r, status: "final", finalized_at: now, updated_at: now } : r)),
          activeReportId: s.activeReportId === id ? null : s.activeReportId,
        },
        { title: "Report finalised", body: "The Digital Trust Report is ready to print or save as PDF.", href: `/reports/${id}`, tone: "info" },
      );
    });
  },

  removeAnalysisFromReport(reportId: string, analysisId: string) {
    sessionCache.forget(analysisId);
    setState((s) => ({
      ...s,
      analyses: s.analyses.filter((a) => a.id !== analysisId),
      reports: s.reports.map((r) =>
        r.id === reportId ? { ...r, analysis_ids: r.analysis_ids.filter((x) => x !== analysisId), updated_at: new Date().toISOString() } : r,
      ),
    }));
  },

  deleteReport(id: string) {
    setState((s) => {
      const report = s.reports.find((r) => r.id === id);
      if (!report) return s;
      report.analysis_ids.forEach((a) => sessionCache.forget(a));
      return {
        ...s,
        reports: s.reports.filter((r) => r.id !== id),
        analyses: s.analyses.filter((a) => !report.analysis_ids.includes(a.id)),
        activeReportId: s.activeReportId === id ? null : s.activeReportId,
      };
    });
  },

  resetData(mode: "sample" | "empty") {
    state.analyses.forEach((a) => sessionCache.forget(a.id));
    setState((s) => ({ ...freshState(mode === "sample"), preferences: s.preferences }));
  },

  setPreferences(patch: Partial<Preferences>) {
    setState((s) => ({ ...s, preferences: { ...s.preferences, ...patch } }));
  },

  markNotificationsRead() {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  },

  clearNotifications() {
    setState((s) => ({ ...s, notifications: [] }));
  },
};
