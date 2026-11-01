/**
 * Demo scam & URL engine — transparent, rule-based heuristics that run in the
 * browser. This is NOT a trained model and performs no network lookups. It exists
 * so the interface can be demonstrated end-to-end until the FastAPI backend is
 * connected, and its output is always labelled as demo output.
 */
import type {
  AnalysisCoverage,
  EvidenceItem,
  ScamAnalysis,
  ScamSignalCategory,
  SignalHit,
  SignalSeverity,
  UrlInspection,
} from "@/types/analysis";
import { clamp, round } from "@/lib/utils";
import { riskLevel } from "@/lib/risk";

export const SCAM_MODEL_VERSION = "demo-scam-heuristics-0.4.0";

interface LanguageRule {
  id: string;
  label: string;
  category: ScamSignalCategory;
  weight: number;
  severity: SignalSeverity;
  explanation: string;
  patterns: RegExp[];
}

const LANGUAGE_RULES: LanguageRule[] = [
  {
    id: "urgency",
    label: "Urgency or time pressure",
    category: "urgency",
    weight: 14,
    severity: "medium",
    explanation: "Creates pressure to act before you have time to verify — a common social-engineering tactic.",
    patterns: [
      /\burgent(ly)?\b/gi,
      /\bimmediately\b/gi,
      /\bwithin \d{1,2} (hours?|minutes?)\b/gi,
      /\bact now\b/gi,
      /\blast (chance|warning|reminder)\b/gi,
      /\bexpires? (today|soon|tonight)\b/gi,
      /\bfinal notice\b/gi,
      /\basap\b/gi,
      /\btoday only\b/gi,
    ],
  },
  {
    id: "threat",
    label: "Threat of suspension, penalty or legal action",
    category: "threat",
    weight: 14,
    severity: "medium",
    explanation: "Threatens negative consequences to provoke a fearful, hurried response.",
    patterns: [
      /\b(account|card|service) (will be |has been |is )?(suspended|locked|blocked|deactivated|terminated|closed)\b/gi,
      /\blegal action\b/gi,
      /\b(arrest|warrant|penalty|penalties|fine of)\b/gi,
    ],
  },
  {
    id: "credentials",
    label: "Request for passwords, codes or account details",
    category: "credentials",
    weight: 22,
    severity: "high",
    explanation: "Legitimate organisations rarely ask for passwords, one-time codes or full card details by message.",
    patterns: [
      /\b(password|passcode|otp|one[- ]time (code|password)|verification code|security code|cvv|card number|login details|pin number)\b/gi,
      /\b(verify|confirm|update|validate) (your )?(account|identity|details|information|payment)\b/gi,
    ],
  },
  {
    id: "payment",
    label: "Unusual payment request",
    category: "payment",
    weight: 20,
    severity: "high",
    explanation: "Gift cards, crypto, wire transfers and upfront 'fees' are hard to reverse and favoured by scammers.",
    patterns: [
      /\bgift ?cards?\b/gi,
      /\b(bitcoin|crypto(currency)?|usdt|btc|ethereum)\b/gi,
      /\bwire transfer\b/gi,
      /\b(processing|release|clearance|delivery|customs) fee\b/gi,
      /\bwestern union\b/gi,
    ],
  },
  {
    id: "impersonation",
    label: "Mentions a brand or authority",
    category: "impersonation",
    weight: 8,
    severity: "low",
    explanation: "References a well-known organisation. Not suspicious alone, but often used to borrow trust.",
    patterns: [
      /\b(paypal|amazon|apple|microsoft|netflix|irs|hmrc|income tax|customs|police|fedex|dhl|ups|usps|whatsapp|google|your bank)\b/gi,
    ],
  },
  {
    id: "too_good",
    label: "Prize, refund or too-good-to-be-true offer",
    category: "too_good_to_be_true",
    weight: 14,
    severity: "medium",
    explanation: "Unexpected winnings, refunds or guaranteed returns are classic lures.",
    patterns: [
      /\bcongratulations\b/gi,
      /\byou('ve| have) (won|been selected)\b/gi,
      /\b(lottery|prize|jackpot|free gift)\b/gi,
      /\bclaim your\b/gi,
      /\bguaranteed (returns?|profits?|income)\b/gi,
      /\bdouble your (money|investment)\b/gi,
    ],
  },
  {
    id: "generic_greeting",
    label: "Generic greeting",
    category: "impersonation",
    weight: 5,
    severity: "low",
    explanation: "Mass-sent scams often avoid using your name.",
    patterns: [/\bdear (customer|user|client|sir|madam|account holder|valued member)\b/gi],
  },
  {
    id: "secrecy",
    label: "Request for secrecy",
    category: "threat",
    weight: 10,
    severity: "medium",
    explanation: "Asking you not to tell anyone isolates you from people who could spot the scam.",
    patterns: [/\b(do not|don'?t) (tell|share this with|inform)\b/gi, /\bkeep this (confidential|secret|private)\b/gi],
  },
  {
    id: "click_pressure",
    label: "Pressure to click a link or log in",
    category: "credentials",
    weight: 8,
    severity: "low",
    explanation: "Directs you to a link instead of the organisation's official app or website.",
    patterns: [/\b(click|tap) (here|the link|below|this link)\b/gi, /\blog ?in (here|now|below|using)\b/gi],
  },
];

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "rebrand.ly",
];
const RISKY_TLDS = [
  "zip", "mov", "xyz", "top", "click", "link", "gq", "tk", "ml", "cf", "ga", "work", "rest", "cam", "icu", "buzz", "sbs", "cfd",
];
const BRANDS = ["paypal", "amazon", "apple", "microsoft", "netflix", "google", "whatsapp", "fedex", "dhl", "instagram", "facebook", "bank"];
const SECOND_LEVEL = ["co", "com", "org", "net", "gov", "ac", "edu"];

const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"')]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"')]*)/gi;

export interface ScamInput {
  text?: string;
  url?: string;
}

function snippet(s: string, max = 60): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Hostname as typed, before the URL parser converts Unicode to punycode. */
function rawHost(url: string): string {
  const withoutScheme = url.replace(/^[a-z]+:\/\//i, "");
  const afterAt = withoutScheme.includes("@") ? withoutScheme.split("@").pop() ?? "" : withoutScheme;
  return afterAt.split(/[/?#:]/)[0]?.toLowerCase() ?? "";
}

export function registeredDomain(host: string): string {
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const tld = labels[labels.length - 1];
  const second = labels[labels.length - 2];
  if (tld.length === 2 && SECOND_LEVEL.includes(second)) return labels.slice(-3).join(".");
  return labels.slice(-2).join(".");
}

export function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(URL_PATTERN) ?? [])).slice(0, 10);
}

export function isPlausibleUrl(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(v) ? v : `http://${v}`);
    return u.hostname.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname);
  } catch {
    return false;
  }
}

function inspectUrl(url: string): { inspection: UrlInspection; hits: SignalHit[] } {
  const normalized = /^[a-z]+:\/\//i.test(url) ? url : `http://${url}`;
  const host = rawHost(normalized);
  let parsed: URL | null = null;
  try {
    parsed = new URL(normalized);
  } catch {
    parsed = null;
  }
  const asciiHost = parsed?.hostname ?? host;
  const labels = asciiHost.split(".").filter(Boolean);
  const tld = labels[labels.length - 1] ?? "";
  const regDomain = registeredDomain(asciiHost);
  const subdomainCount = Math.max(0, labels.length - regDomain.split(".").length);
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(asciiHost);
  const hasNonAscii = /[^\x00-\x7f]/.test(host);
  const isPunycode = asciiHost.split(".").some((l) => l.startsWith("xn--"));
  const path = parsed ? parsed.pathname + parsed.search : "";

  const inspection: UrlInspection = {
    raw_host: host || asciiHost,
    protocol: parsed?.protocol.replace(":", "") ?? "unknown",
    tld,
    subdomain_count: subdomainCount,
    path_length: path.length,
    is_ip_host: isIp,
    is_punycode: isPunycode,
    has_non_ascii: hasNonAscii,
  };

  const hits: SignalHit[] = [];
  const add = (id: string, label: string, weight: number, severity: SignalSeverity, explanation: string, match: string) =>
    hits.push({ id, label, category: "url", weight, severity, explanation, matches: [snippet(match)] });

  if (SHORTENERS.includes(asciiHost.replace(/^www\./, ""))) {
    add("shortener", "Shortened URL", 15, "medium", "Link shorteners hide the final destination until you click.", asciiHost);
  }
  if (isIp) {
    add("ip_host", "Raw IP address instead of a domain", 22, "high", "Legitimate services almost always use named domains.", asciiHost);
  }
  if (hasNonAscii) {
    add(
      "unicode",
      "Unicode lookalike characters in domain",
      25,
      "high",
      "Non-Latin characters can imitate familiar letters (e.g. Cyrillic 'а' vs Latin 'a') to spoof a trusted domain.",
      host,
    );
  } else if (isPunycode) {
    add("punycode", "Punycode (internationalised) domain", 18, "high", "Encoded internationalised domains can disguise lookalike characters.", asciiHost);
  }
  if (RISKY_TLDS.includes(tld)) {
    add("risky_tld", `Frequently abused top-level domain (.${tld})`, 12, "medium", "This TLD is cheap to register and appears often in abuse reports. Many legitimate sites use it too.", `.${tld}`);
  }
  if (inspection.protocol === "http") {
    add("no_tls", "Unencrypted HTTP link", 6, "low", "The link does not use HTTPS. Never enter credentials on such pages.", "http://");
  }
  if (subdomainCount >= 3) {
    add("deep_subdomains", "Unusually deep subdomain chain", 10, "medium", "Long subdomain chains can push the real domain out of view on small screens.", asciiHost);
  }
  if ((regDomain.split(".")[0]?.match(/-/g)?.length ?? 0) >= 2) {
    add("hyphenated", "Heavily hyphenated domain", 8, "low", "Domains like secure-login-update.example are a common phishing pattern.", regDomain);
  }
  if (/^[^/]*\/\/[^/]*@/.test(normalized)) {
    add("at_sign", "'@' symbol in URL authority", 18, "high", "Everything before '@' is ignored by browsers, which can disguise the real host.", "@");
  }
  const regLabel = regDomain.split(".")[0] ?? "";
  const brandInHost = BRANDS.find((b) => asciiHost.includes(b));
  if (brandInHost && !regLabel.includes(brandInHost)) {
    add(
      "brand_outside_domain",
      `Brand name "${brandInHost}" used outside its own domain`,
      20,
      "high",
      `The registered domain is ${regDomain}, not one owned by ${brandInHost}. Brand names in subdomains or paths are easy to fake.`,
      asciiHost,
    );
  }
  const deLeet = asciiHost.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s").replace(/rn/g, "m");
  const lookalike = BRANDS.find((b) => deLeet.includes(b) && !asciiHost.includes(b));
  if (lookalike) {
    add("lookalike_spelling", `Lookalike spelling of "${lookalike}"`, 22, "high", "Character swaps such as 0→o or 1→l imitate trusted brands.", asciiHost);
  }
  if (/(login|signin|verify|secure|account|update|wallet|unlock)/i.test(path)) {
    add("sensitive_path", "Account or login wording in link path", 6, "low", "Paths that mention login or verification deserve extra care.", snippet(path, 40));
  }
  if (normalized.length > 100) {
    add("long_url", "Very long URL", 5, "low", "Long URLs can hide suspicious parts beyond the visible area.", `${normalized.length} characters`);
  }
  return { inspection, hits };
}

function scoreFromWeights(total: number): number {
  if (total <= 0) return 4;
  return clamp(Math.round(100 * (1 - Math.exp(-total / 45))), 0, 100);
}

const LABELS = {
  low: "Few scam indicators found",
  medium: "Some scam indicators found",
  high: "Multiple scam indicators found",
  critical: "Strong, converging scam indicators",
} as const;

export function analyzeScamDemo(input: ScamInput, opts: { id: string; createdAt: string; source?: "demo" | "sample" }): ScamAnalysis {
  const text = (input.text ?? "").trim();
  const explicitUrl = (input.url ?? "").trim();
  const urls = Array.from(new Set([...(explicitUrl ? [explicitUrl] : []), ...extractUrls(text)]));

  const languageHits: SignalHit[] = [];
  for (const rule of LANGUAGE_RULES) {
    const matches = new Set<string>();
    for (const p of rule.patterns) {
      for (const m of text.matchAll(p)) matches.add(m[0].toLowerCase());
    }
    if (matches.size > 0) {
      // Repeated cues add a little weight, but with diminishing returns.
      const weight = rule.weight + Math.min(6, (matches.size - 1) * 2);
      languageHits.push({
        id: rule.id,
        label: rule.label,
        category: rule.category,
        weight,
        severity: rule.severity,
        explanation: rule.explanation,
        matches: Array.from(matches).slice(0, 5).map((m) => snippet(m, 40)),
      });
    }
  }
  const ids = new Set(languageHits.map((h) => h.id));
  if (ids.has("impersonation") && (ids.has("credentials") || ids.has("payment"))) {
    languageHits.push({
      id: "authority_plus_request",
      label: "Authority reference combined with a sensitive request",
      category: "impersonation",
      weight: 12,
      severity: "high",
      explanation: "Pairing a trusted name with a request for credentials or money is a hallmark of impersonation scams.",
      matches: [],
    });
  }

  const urlResults = urls.slice(0, 3).map(inspectUrl);
  const urlHits = urlResults.flatMap((r) => r.hits);
  const primary = urlResults[0]?.inspection;

  const all = [...languageHits, ...urlHits].sort((a, b) => b.weight - a.weight);
  const totalWeight = all.reduce((s, h) => s + h.weight, 0);
  const risk = scoreFromWeights(totalWeight);
  const level = riskLevel(risk);

  const hasText = text.length > 0;
  const hasUrl = urls.length > 0;
  let confidence = 0.5;
  if (hasText && text.length < 40) confidence -= 0.15;
  if (hasText && text.length > 200) confidence += 0.08;
  if (hasText && hasUrl) confidence += 0.06;
  confidence += Math.min(0.2, all.length * 0.04);
  if (!hasText) confidence -= 0.08; // URL-only: no message context
  confidence = round(clamp(confidence, 0.2, 0.85), 2);

  const categories = new Set(all.map((h) => h.category));
  const recommendations: string[] = [];
  if (level === "low") {
    recommendations.push("No strong indicators were found, but stay cautious if the message was unexpected.");
  } else {
    recommendations.push("Do not reply, click links or open attachments until you have verified the sender independently.");
  }
  if (categories.has("credentials")) recommendations.push("Never share passwords, one-time codes or card details via message or an unfamiliar page.");
  if (categories.has("payment")) recommendations.push("Do not pay with gift cards, crypto or wire transfers on request — these are very hard to recover.");
  if (categories.has("impersonation")) recommendations.push("Contact the organisation through its official app, website or a number you already trust.");
  if (categories.has("url")) recommendations.push("Type the official address yourself instead of following the link.");
  if (level === "high" || level === "critical") recommendations.push("Report the message to your email provider, mobile carrier or national cybercrime reporting service.");

  const evidence: EvidenceItem[] = all.map((h) => ({
    id: h.id,
    title: h.label,
    detail: h.explanation,
    severity: h.severity,
    category: h.category,
    snippet: h.matches[0],
  }));

  const assessed = [hasText ? "Message language patterns (English)" : null, hasUrl ? "URL & domain structure" : null].filter(
    (x): x is string => x !== null,
  );
  const notAssessed = [
    hasText ? null : "Message language (no text provided)",
    hasUrl ? null : "URL structure (no link provided)",
    "Live domain reputation, WHOIS age and blocklists",
    "Sender authentication (SPF / DKIM / caller ID)",
  ].filter((x): x is string => x !== null);
  const coverage: AnalysisCoverage = {
    ratio: round(assessed.length / (assessed.length + notAssessed.length), 2),
    assessed,
    not_assessed: notAssessed,
    note: "Structural checks only. No request was made to the linked site.",
  };

  const host = primary?.raw_host;
  const title = hasText ? (host ? `Message with link to ${host}` : "Pasted message") : `Link: ${host ?? "unknown host"}`;
  const inputSummary = [
    hasText ? `${text.length} characters` : null,
    hasUrl ? `${urls.length} link${urls.length > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: opts.id,
    module: "scam",
    status: "completed",
    title,
    input_summary: inputSummary,
    risk_score: risk,
    confidence,
    label: LABELS[level],
    reasons:
      all.length > 0
        ? all.slice(0, 4).map((h) => `${h.label}: ${h.explanation}`)
        : ["None of the language or URL patterns checked by the demo heuristics were present."],
    evidence,
    limitations: [
      "Demo output from transparent rule-based heuristics running in your browser — not a trained AI model.",
      "No live domain reputation, WHOIS or blocklist lookup was performed.",
      "Legitimate messages can contain urgent language, and scams can avoid every listed pattern.",
      "Patterns are tuned for English text.",
    ],
    recommendations,
    model_version: SCAM_MODEL_VERSION,
    coverage,
    data_source: opts.source ?? "demo",
    created_at: opts.createdAt,
    completed_at: opts.createdAt,
    details: {
      input_kind: hasText && hasUrl ? "text_and_url" : hasText ? "text" : "url",
      char_count: text.length,
      url_count: urls.length,
      url: primary,
      language_signals: languageHits.sort((a, b) => b.weight - a.weight),
      url_signals: urlHits.sort((a, b) => b.weight - a.weight),
      reputation_lookup: "not_performed",
    },
  };
}
