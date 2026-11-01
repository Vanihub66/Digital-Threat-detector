import { CalendarDays, ExternalLink, FlaskConical } from "lucide-react";
import type { SourceItem, SourceStance } from "@/types/analysis";
import { Badge, type Tone } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const STANCE_META: Record<SourceStance, { label: string; tone: Tone; color: string }> = {
  supports: { label: "Supports claim", tone: "success", color: "var(--low)" },
  contradicts: { label: "Contradicts claim", tone: "danger", color: "var(--critical)" },
  neutral: { label: "Neutral / context", tone: "neutral", color: "var(--subtle)" },
};

export function SourceCard({ source }: { source: SourceItem }) {
  const stance = STANCE_META[source.stance];
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-bg-2/60 p-4 print-avoid-break">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stance.tone}>{stance.label}</Badge>
        {source.illustrative && (
          <Badge tone="ai">
            <FlaskConical aria-hidden /> Illustrative example
          </Badge>
        )}
      </div>
      <p className="mt-3 text-xs font-medium text-muted">{source.publisher}</p>
      <h4 className="mt-0.5 text-sm font-semibold text-fg">{source.title}</h4>
      <p className="mt-2 flex-1 text-sm text-muted">{source.excerpt}</p>
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs text-subtle">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden /> {formatDate(source.date)}
          </span>
          <span>Relevance {Math.round(source.relevance * 100)}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-accent-2" style={{ width: `${source.relevance * 100}%` }} />
        </div>
        {source.url && !source.illustrative ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            Open source <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <p className="text-xs text-subtle">No link — illustrative source, not retrieved.</p>
        )}
      </div>
    </article>
  );
}
