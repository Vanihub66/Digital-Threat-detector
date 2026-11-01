"use client";

import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { ScamResult } from "@/features/scam/scam-result";
import { ClaimResult } from "@/features/verification/claim-result";
import { ImageResult } from "@/features/image-analysis/image-result";
import { VideoResult } from "@/features/video-analysis/video-result";
import { useAppState } from "@/store/app-store";
import { ResultHeader } from "./result-header";

export function ResultView({ id }: { id: string }) {
  const state = useAppState();

  if (!state.hydrated) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading result">
        <Skeleton className="h-20 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const result = state.analyses.find((a) => a.id === id);
  if (!result) {
    return (
      <Card>
        <EmptyState
          icon={<SearchX />}
          title="Analysis not found"
          description="It may have been deleted, replaced by a newer run of the same module, or created in another browser."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/reports" variant="secondary">
                Reports history
              </ButtonLink>
              <ButtonLink href="/analyze">New analysis</ButtonLink>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ResultHeader result={result} />
      {result.module === "scam" && <ScamResult result={result} />}
      {result.module === "claim" && <ClaimResult result={result} />}
      {result.module === "image" && <ImageResult result={result} />}
      {result.module === "video" && <VideoResult result={result} />}
    </div>
  );
}
