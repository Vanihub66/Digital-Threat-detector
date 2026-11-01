"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { actions, getAppState, useAppState } from "@/store/app-store";
import { refreshVideoJob } from "@/services/analysis-service";
import type { VideoAnalysis } from "@/types/analysis";

/** Applies theme and motion preferences to <html>. */
function PreferenceSync() {
  const { preferences, hydrated } = useAppState();
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      root.dataset.theme = preferences.theme === "system" ? (media.matches ? "light" : "dark") : preferences.theme;
    };
    apply();
    root.dataset.reducedMotion = String(preferences.reducedMotion);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.theme, preferences.reducedMotion, hydrated]);
  return null;
}

/** Advances queued/processing video jobs (demo simulation or backend polling). */
function VideoJobRunner() {
  const { analyses } = useAppState();
  const { toast } = useToast();
  const running = analyses.some((a) => a.module === "video" && (a.status === "queued" || a.status === "processing"));

  useEffect(() => {
    if (!running) return;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const jobs = getAppState().analyses.filter(
          (a): a is VideoAnalysis => a.module === "video" && (a.status === "queued" || a.status === "processing"),
        );
        for (const job of jobs) {
          const next = await refreshVideoJob(job);
          if (next !== job && JSON.stringify(next) !== JSON.stringify(job)) {
            actions.updateAnalysis(next);
            if (next.status === "completed") toast({ tone: "success", title: "Video analysis complete", description: next.title });
            if (next.status === "failed") toast({ tone: "error", title: "Video analysis failed", description: next.error });
            if (next.status === "insufficient_coverage")
              toast({ tone: "warning", title: "Insufficient face coverage", description: "No manipulation score was produced." });
          }
        }
      } catch {
        // Backend polling failed — try again on the next tick.
      } finally {
        busy = false;
      }
    };
    const id = window.setInterval(tick, 600);
    return () => window.clearInterval(id);
  }, [running, toast]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const { preferences } = useAppState();
  return (
    <MotionConfig reducedMotion={preferences.reducedMotion ? "always" : "user"}>
      <ToastProvider>
        <PreferenceSync />
        <VideoJobRunner />
        {children}
      </ToastProvider>
    </MotionConfig>
  );
}
