import type { ModuleId } from "@/types/analysis";

export const MODULE_GUIDE: Record<ModuleId, { checks: string[]; limits: string[] }> = {
  scam: {
    checks: [
      "Urgency, threats and secrecy requests",
      "Requests for passwords, codes or payments",
      "Brand / authority impersonation cues",
      "Shortened, lookalike, punycode & Unicode domains",
      "Risky TLDs, IP hosts and deep subdomains",
    ],
    limits: ["No live reputation or WHOIS lookup in demo mode", "English-language patterns", "Does not open the link"],
  },
  claim: {
    checks: [
      "Whether the claim is specific and checkable",
      "Supporting and contradicting evidence",
      "Source diversity, recency and relevance",
      "Conflicts, gaps and ambiguity",
    ],
    limits: ["No live retrieval in demo mode", "Example claims use illustrative sources only", "Never issues a true/false verdict"],
  },
  image: {
    checks: [
      "Real file metadata & EXIF presence",
      "Resolution and compression quality",
      "Synthetic-media & editing indicators",
      "Visual artefact observations",
    ],
    limits: ["Detector is simulated in demo mode", "Compression and filters reduce reliability", "Unfamiliar generators may evade detection"],
  },
  video: {
    checks: [
      "Real duration, resolution and size",
      "Frame sampling coverage",
      "Face presence per sampled frame",
      "Per-frame scores & temporal consistency",
    ],
    limits: ["Face detection and scores are simulated in demo mode", "Audio & lip-sync not assessed", "Requires visible faces"],
  },
};
