"use client";

import { Fragment } from "react";
import { Globe, KeyRound, MessageSquareWarning, Radar, TextSearch } from "lucide-react";
import type { ScamAnalysis, SignalHit } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import {
  CoverageCard,
  DataSourceNotice,
  LimitationsCard,
  ModelInfoCard,
  RecommendationsCard,
  SignalList,
  SummaryCard,
} from "@/components/results/result-blocks";
import { SEVERITY_META } from "@/lib/risk";
import { sessionCache } from "@/lib/session-cache";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<SignalHit["category"], string> = {
  urgency: "Urgency",
  impersonation: "Impersonation",
  payment: "Payment",
  credentials: "Credentials",
  threat: "Threat",
  too_good_to_be_true: "Lure",
  url: "URL",
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, phrases }: { text: string; phrases: string[] }) {
  const unique = Array.from(new Set(phrases.filter((p) => p && !p.endsWith("…")))).sort((a, b) => b.length - a.length);
  if (unique.length === 0) return <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{text}</p>;
  const re = new RegExp(`(${unique.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-high/15 px-0.5 text-fg underline decoration-high/60 decoration-2 underline-offset-2">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

function SignalHitList({ hits, empty }: { hits: SignalHit[]; empty: string }) {
  if (hits.length === 0) return <p className="text-sm text-subtle">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {hits.map((h) => {
        const sev = SEVERITY_META[h.severity];
        return (
          <li key={h.id} className="rounded-xl border border-border bg-bg-2/60 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-auto text-sm font-medium text-fg">{h.label}</p>
              <Badge tone="neutral">{CATEGORY_LABEL[h.category]}</Badge>
              <Badge className={cn(sev.bg, sev.text, sev.border)}>
                {sev.label} · +{h.weight}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{h.explanation}</p>
            {h.matches.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {h.matches.map((m) => (
                  <code key={m} className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
                    {m}
                  </code>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ScamResult({ result }: { result: ScamAnalysis }) {
  const d = result.details;
  const text = sessionCache.getText(result.id);
  const phrases = d.language_signals.flatMap((s) => s.matches);
  const url = d.url;

  return (
    <div className="space-y-6">
      <DataSourceNotice result={result} />
      <SummaryCard
        result={result}
        caption="Scam risk"
        extra={
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="neutral">{d.language_signals.length} language signals</Badge>
            <Badge tone="neutral">{d.url_signals.length} URL signals</Badge>
            <Badge tone="neutral">{d.url_count} link(s) found</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Key risk signals" description="Strongest contributors to the score, in order" icon={<Radar />} />
            <CardBody>
              <SignalList items={result.evidence.slice(0, 4)} empty="No risk signals were detected by the checks that ran." />
              {result.reasons.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-surface-2/50 p-4">
                  <p className="text-xs font-medium tracking-wide text-subtle uppercase">Why this score</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                    {result.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Suspicious language indicators" icon={<MessageSquareWarning />} description="Phrases matched in the message text" />
            <CardBody>
              <SignalHitList hits={d.language_signals} empty={d.char_count ? "No suspicious language patterns matched." : "No message text was provided."} />
            </CardBody>
          </Card>

          {text && (
            <Card>
              <CardHeader
                title="Highlighted message"
                icon={<TextSearch />}
                description="Visible in this tab only — the raw text is not saved"
                action={<Badge tone="accent">Session only</Badge>}
              />
              <CardBody>
                <div className="scrollbar-thin max-h-72 overflow-auto rounded-xl border border-border bg-bg-2 p-4">
                  <HighlightedText text={text} phrases={phrases} />
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="URL & domain inspection" icon={<Globe />} description="Structural checks on the link — the site was not visited" />
            <CardBody className="space-y-4">
              {url ? (
                <>
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    {[
                      ["Host", <code key="h" className="font-mono text-xs break-all">{url.raw_host}</code>],
                      ["Protocol", url.protocol.toUpperCase()],
                      ["TLD", `.${url.tld}`],
                      ["Subdomains", url.subdomain_count],
                      ["IP host", url.is_ip_host ? "Yes" : "No"],
                      ["Punycode", url.is_punycode ? "Yes" : "No"],
                      ["Non-ASCII chars", url.has_non_ascii ? "Yes" : "No"],
                      ["Path length", url.path_length],
                    ].map(([k, v]) => (
                      <div key={k as string} className="rounded-lg border border-border bg-bg-2/60 p-2.5">
                        <dt className="text-[11px] text-subtle">{k}</dt>
                        <dd className="mt-0.5 text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <SignalHitList hits={d.url_signals} empty="No suspicious URL structure patterns were found." />
                </>
              ) : (
                <p className="text-sm text-subtle">No URL was provided or detected in the message.</p>
              )}
              <Notice tone="info" icon={<KeyRound />}>
                {d.reputation_lookup === "performed"
                  ? "Domain reputation data was supplied by the backend."
                  : "No live domain reputation, WHOIS or blocklist lookup was performed. A clean structure does not mean a link is safe."}
              </Notice>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <RecommendationsCard items={result.recommendations} />
          <CoverageCard result={result} />
          <ModelInfoCard result={result} />
          <LimitationsCard items={result.limitations} />
        </div>
      </div>
    </div>
  );
}
