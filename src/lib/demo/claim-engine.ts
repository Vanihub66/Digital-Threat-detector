/**
 * Demo claim engine.
 *
 * - The checkability assessment is a real, local text heuristic.
 * - NO evidence retrieval happens in demo mode. For arbitrary claims the honest
 *   outcome is "Insufficient reliable evidence".
 * - The bundled example claims ship with ILLUSTRATIVE evidence packs (fictional
 *   publishers, no links) so the evidence-review interface can be demonstrated.
 *   Every illustrative source is flagged `illustrative: true` and labelled in the UI.
 */
import type { ClaimAnalysis, ClaimContext, ClaimVerdict, SourceItem, VerificationStep } from "@/types/analysis";
import { clamp, round } from "@/lib/utils";

export const CLAIM_MODEL_VERSION = "demo-claim-checkability-0.3.0";

export interface ClaimInput {
  claim: string;
  context: ClaimContext;
}

interface IllustrativePack {
  verdict: Exclude<ClaimVerdict, "insufficient" | "needs_clarification">;
  risk: number;
  coverage: number;
  recency: string;
  sources: Omit<SourceItem, "illustrative">[];
  conflicts: string[];
  missing: string[];
}

export interface ClaimExample {
  key: string;
  title: string;
  claim: string;
  context: ClaimContext;
  pack?: IllustrativePack;
}

export const CLAIM_EXAMPLES: ClaimExample[] = [
  {
    key: "lemon-water",
    title: "Health remedy (evidence contradicts)",
    claim: "Drinking hot lemon water every morning cures the common cold within 24 hours.",
    context: { notes: "Seen in a widely forwarded wellness message." },
    pack: {
      verdict: "contradicts",
      risk: 72,
      coverage: 0.8,
      recency: "Illustrative sources dated 2023–2025",
      sources: [
        {
          id: "s1",
          publisher: "Example Clinical Review Journal",
          title: "Illustrative: Home remedies and the duration of common colds",
          date: "2024-09-12",
          excerpt: "Illustrative excerpt — reviewed trials found no remedy that reliably ends a cold within a day; symptoms typically last 7–10 days.",
          stance: "contradicts",
          relevance: 0.92,
        },
        {
          id: "s2",
          publisher: "Example Public Health Agency",
          title: "Illustrative: Common cold — symptoms and care",
          date: "2025-01-20",
          excerpt: "Illustrative excerpt — warm fluids may soothe a sore throat but are not a cure. Rest and hydration are recommended.",
          stance: "contradicts",
          relevance: 0.84,
        },
        {
          id: "s3",
          publisher: "Example Nutrition Blog",
          title: "Illustrative: Why I swear by lemon water",
          date: "2023-11-02",
          excerpt: "Illustrative excerpt — a personal account describing feeling better after drinking lemon water, without controlled comparison.",
          stance: "supports",
          relevance: 0.41,
        },
      ],
      conflicts: [
        "One low-relevance personal blog supports the claim, but it is anecdotal and does not test the 24-hour timeframe.",
      ],
      missing: ["No controlled study tested lemon water specifically against a 24-hour recovery timeframe."],
    },
  },
  {
    key: "riverton-metro",
    title: "Local infrastructure (mixed evidence)",
    claim: "The city of Riverton opened a new 12 km metro line in March 2025.",
    context: { date: "March 2025", location: "Riverton (fictional city)", entities: "Riverton Transit Authority" },
    pack: {
      verdict: "mixed",
      risk: 46,
      coverage: 0.6,
      recency: "Illustrative sources dated Feb–Apr 2025",
      sources: [
        {
          id: "s1",
          publisher: "Example Riverton Daily",
          title: "Illustrative: Metro Line 3 welcomes first passengers",
          date: "2025-03-18",
          excerpt: "Illustrative excerpt — the first section of Line 3 opened to passengers this week.",
          stance: "supports",
          relevance: 0.88,
        },
        {
          id: "s2",
          publisher: "Example Transit Authority Bulletin",
          title: "Illustrative: Line 3 phase one — 8.4 km operational",
          date: "2025-03-17",
          excerpt: "Illustrative excerpt — phase one covers 8.4 km; the remaining 3.6 km is scheduled for later in the year.",
          stance: "contradicts",
          relevance: 0.9,
        },
        {
          id: "s3",
          publisher: "Example Regional Wire",
          title: "Illustrative: Delays push full metro opening",
          date: "2025-04-02",
          excerpt: "Illustrative excerpt — the full 12 km route has not yet opened due to signalling tests.",
          stance: "contradicts",
          relevance: 0.76,
        },
        {
          id: "s4",
          publisher: "Example City Council Minutes",
          title: "Illustrative: Infrastructure committee update",
          date: "2025-02-26",
          excerpt: "Illustrative excerpt — opening of the first phase planned for mid-March.",
          stance: "neutral",
          relevance: 0.55,
        },
      ],
      conflicts: [
        "Sources agree a metro line opened in March 2025, but disagree with the claim on length: 8.4 km opened, not 12 km.",
      ],
      missing: ["No source confirms the full 12 km length being in service in March 2025."],
    },
  },
  {
    key: "handwashing",
    title: "Public health guidance (evidence supports)",
    claim: "Regular handwashing with soap reduces the spread of many common infections.",
    context: {},
    pack: {
      verdict: "supports",
      risk: 12,
      coverage: 0.85,
      recency: "Illustrative sources dated 2022–2025",
      sources: [
        {
          id: "s1",
          publisher: "Example Public Health Agency",
          title: "Illustrative: Hand hygiene and infection prevention",
          date: "2024-05-05",
          excerpt: "Illustrative excerpt — handwashing with soap is a well-established measure for reducing transmission of many infections.",
          stance: "supports",
          relevance: 0.93,
        },
        {
          id: "s2",
          publisher: "Example Systematic Review Collaboration",
          title: "Illustrative: Community hand hygiene interventions",
          date: "2022-10-14",
          excerpt: "Illustrative excerpt — pooled studies show reductions in respiratory and gastrointestinal illness.",
          stance: "supports",
          relevance: 0.87,
        },
      ],
      conflicts: [],
      missing: ["'Many common infections' is broad; effect sizes differ by infection type and setting."],
    },
  },
  {
    key: "vague",
    title: "Vague statement (needs clarification)",
    claim: "They are hiding the truth about the new policy.",
    context: {},
  },
];

const VAGUE_TERMS = /\b(they|them|people|everyone|someone|some|many|lots of|always|never|the truth|the government|experts say|scientists say)\b/gi;
const OPINION_TERMS = /\b(best|worst|beautiful|ugly|should|terrible|amazing|evil|corrupt|believe|feel)\b/gi;

function assessCheckability(claim: string, ctx: ClaimContext) {
  const strengths: string[] = [];
  const issues: string[] = [];
  const words = claim.trim().split(/\s+/).filter(Boolean);

  if (/\d/.test(claim)) strengths.push("Contains specific numbers, dates or quantities.");
  const properNouns = claim
    .split(/\s+/)
    .slice(1)
    .filter((w) => /^[A-Z][a-z]+/.test(w));
  if (properNouns.length > 0 || ctx.entities) strengths.push("Names specific people, places or organisations.");
  if (ctx.date || /\b(19|20)\d{2}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(claim))
    strengths.push("Has a timeframe that evidence can be matched against.");
  if (ctx.location) strengths.push("Has a location that narrows the evidence search.");

  if (words.length < 6) issues.push("Very short — key details (who, what, when, where) may be missing.");
  const vague = Array.from(new Set((claim.match(VAGUE_TERMS) ?? []).map((m) => m.toLowerCase())));
  if (vague.length > 0) issues.push(`Uses vague or sweeping terms: ${vague.map((v) => `"${v}"`).join(", ")}.`);
  const opinion = Array.from(new Set((claim.match(OPINION_TERMS) ?? []).map((m) => m.toLowerCase())));
  if (opinion.length > 0) issues.push(`Contains opinion or value words (${opinion.map((v) => `"${v}"`).join(", ")}) that cannot be fact-checked.`);
  if (claim.trim().endsWith("?")) issues.push("Phrased as a question rather than a statement.");
  if (/\bwill\b/i.test(claim)) issues.push("Makes a prediction about the future, which cannot yet be verified.");

  const score = round(clamp(0.55 + strengths.length * 0.12 - issues.length * 0.12 - Math.max(0, vague.length - 1) * 0.08, 0, 1), 2);
  const needsClarification =
    words.length < 5 || vague.length >= 2 || opinion.length > 0 || claim.trim().endsWith("?") || /\bwill\b/i.test(claim);
  return { score, strengths, issues, needsClarification };
}

export function verificationSteps(claim: string): VerificationStep[] {
  const q = encodeURIComponent(claim.slice(0, 200));
  return [
    { label: "Search existing fact-checks in Google Fact Check Explorer", url: `https://toolbox.google.com/factcheck/explorer/search/${q}` },
    { label: "Look for recent news coverage from multiple outlets", url: `https://news.google.com/search?q=${q}` },
    { label: "Trace the claim back to its original source and check who first published it." },
    { label: "Look for primary evidence: official statistics, court records, peer-reviewed research or direct statements." },
    { label: "Check that the date and location of any supporting media match the claim." },
  ];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

const VERDICT_LABEL: Record<ClaimVerdict, string> = {
  supports: "Evidence supports",
  contradicts: "Evidence contradicts",
  mixed: "Mixed evidence",
  insufficient: "Insufficient reliable evidence",
  needs_clarification: "Claim needs clarification",
};

export function verdictLabel(v: ClaimVerdict): string {
  return VERDICT_LABEL[v];
}

export function analyzeClaimDemo(input: ClaimInput, opts: { id: string; createdAt: string; source?: "demo" | "sample" }): ClaimAnalysis {
  const claim = input.claim.trim();
  const { needsClarification, ...checkability } = assessCheckability(claim, input.context);
  const example = CLAIM_EXAMPLES.find((e) => e.pack && normalize(e.claim) === normalize(claim));
  const pack = example?.pack;

  let verdict: ClaimVerdict;
  if (needsClarification) verdict = "needs_clarification";
  else if (pack) verdict = pack.verdict;
  else verdict = "insufficient";

  const sources: SourceItem[] = pack && verdict !== "needs_clarification" ? pack.sources.map((s) => ({ ...s, illustrative: true })) : [];
  const publishers = new Set(sources.map((s) => s.publisher));
  const diversity = sources.length ? round(clamp(publishers.size / 4, 0, 1), 2) : null;
  const supports = sources.filter((s) => s.stance === "supports").length;
  const contradicts = sources.filter((s) => s.stance === "contradicts").length;

  const scored = verdict !== "insufficient" && verdict !== "needs_clarification";
  const confidence = scored && pack ? round(clamp(0.35 + pack.coverage * 0.35 + (diversity ?? 0) * 0.15, 0, 0.85), 2) : null;

  const reasons: string[] = [];
  if (verdict === "needs_clarification") {
    reasons.push("The claim is too vague or subjective to match against evidence reliably.");
    reasons.push(...checkability.issues);
  } else if (verdict === "insufficient") {
    reasons.push("No evidence retrieval service is connected in demo mode, so no sources were reviewed.");
    reasons.push("Without reliable sources, the claim cannot be assessed either way.");
  } else {
    reasons.push(`${supports} illustrative source${supports === 1 ? "" : "s"} support and ${contradicts} contradict the claim.`);
    if (pack?.conflicts[0]) reasons.push(pack.conflicts[0]);
  }

  const missing = [
    ...(pack?.missing ?? []),
    ...(verdict === "insufficient" ? ["No sources were retrieved. Connect the verification backend to review real evidence."] : []),
  ];
  const ambiguity = verdict === "needs_clarification" ? checkability.issues : checkability.issues.slice(0, 2);

  return {
    id: opts.id,
    module: "claim",
    status: "completed",
    title: claim.length > 70 ? `${claim.slice(0, 69)}…` : claim,
    input_summary: `${claim.split(/\s+/).length} words${input.context.date || input.context.location || input.context.entities ? " · with context" : ""}`,
    risk_score: scored && pack ? pack.risk : null,
    confidence,
    label: VERDICT_LABEL[verdict],
    reasons,
    evidence: [
      ...checkability.strengths.map((s, i) => ({ id: `str-${i}`, title: "Checkable detail", detail: s, severity: "info" as const })),
      ...ambiguity.map((s, i) => ({ id: `amb-${i}`, title: "Ambiguity", detail: s, severity: "medium" as const })),
    ],
    limitations: [
      pack
        ? "Sources shown are ILLUSTRATIVE examples bundled with the demo. They were not retrieved and have no links."
        : "Demo mode does not retrieve evidence; no sources were searched.",
      "Automated evidence review can miss recent developments, paywalled sources and non-English coverage.",
      "The result describes the available evidence — it is not a ruling that the claim is true or false.",
    ],
    recommendations:
      verdict === "needs_clarification"
        ? ["Rewrite the claim with who, what, when and where so it can be checked.", "Separate opinions from factual statements."]
        : ["Use the verification steps below before sharing or acting on this claim.", "Prefer primary sources over reposts and screenshots."],
    model_version: CLAIM_MODEL_VERSION,
    coverage: {
      ratio: pack ? pack.coverage : 0.2,
      assessed: ["Claim structure & checkability", ...(pack ? ["Illustrative evidence pack (example only)"] : [])],
      not_assessed: ["Live web & news retrieval", "Fact-check database lookup", "Non-English sources"],
      note: pack ? "Illustrative evidence — not retrieved." : "Only the claim text was analysed.",
    },
    data_source: opts.source ?? "demo",
    created_at: opts.createdAt,
    completed_at: opts.createdAt,
    details: {
      claim,
      context: input.context,
      verdict,
      checkability,
      evidence_coverage: pack && scored ? pack.coverage : 0,
      source_diversity: diversity,
      recency: pack && scored ? pack.recency : null,
      sources,
      conflicts: scored ? pack?.conflicts ?? [] : [],
      missing_evidence: missing,
      verification_steps: verificationSteps(claim),
      retrieval: sources.length ? "illustrative" : "none",
    },
  };
}
