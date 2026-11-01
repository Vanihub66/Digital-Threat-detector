# ThreatDetector AI — Frontend

**AI-Powered Digital Trust & Threat Detection Platform** (final-year project).

ThreatDetector AI helps people assess potentially risky, misleading, manipulated or unsafe digital content across four modules, combined into a unified **Digital Trust Report**:

1. Scam & Suspicious URL Detection
2. Claim Verification & Misinformation Evidence
3. AI-Generated Image & Image Manipulation Assessment
4. Video Deepfake Assessment

Results always communicate **risk, confidence, evidence, coverage and limitations**, never a definitive "real/fake" or "true/false" verdict.

## Quick start

Requires Node.js 20.9+ (22.13+ recommended).

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Checks:

```bash
npm run lint
npm run typecheck
```

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Recharts · Framer Motion · Lucide icons. No paid services, API keys or backend are required.

## Demo mode vs. API mode

By default the app runs in **demo mode**. Everything happens in the browser, nothing is uploaded, and every output is labelled.

| Module | What is real | What is demo/simulated |
| --- | --- | --- |
| Scam & URL | Transparent rule-based heuristics (urgency, credential/payment requests, impersonation, shorteners, punycode/Unicode lookalikes, risky TLDs, IP hosts…). | It is not an ML model. No live reputation, WHOIS or blocklist lookups. |
| Claim | Checkability analysis (specificity, vague/opinion terms, dates, entities). Real search links in the verification steps. | No evidence retrieval. Bundled example claims use **illustrative** sources (fictional publishers, no links). Arbitrary claims return "Insufficient reliable evidence". |
| Image | File type/size, dimensions, JPEG EXIF-block presence, compression and quality indicators. | Detector signals and the manipulation score (deterministic placeholders). |
| Video | Duration, resolution, size, frame-sampling plan. | Face detection, per-frame scores, temporal consistency. A "demo scenario" control lets you show the completed, insufficient-coverage and failed states. |
| Dashboard / History | Computed from stored records. | First launch seeds clearly-labelled **sample** reports (reset in Settings). |

Data is stored in `localStorage` (`threatdetector.demo.v1`). Raw message text and uploaded media are **never** persisted. Previews live only in the current tab's memory.

## Connecting the FastAPI backend

1. Copy `.env.example` to `.env.local`:

   ```env
   NEXT_PUBLIC_THREATDETECTOR_MODE=api
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   NEXT_PUBLIC_API_TIMEOUT_MS=20000
   ```

2. Implement the **proposed** endpoints (see `src/services/api/contracts.ts`):

   | Method | Path | Body | Returns |
   | --- | --- | --- | --- |
   | POST | `/analyze/text` | `{ text, url? }` | `AnalysisResult` (module `scam`) |
   | POST | `/analyze/url` | `{ url }` | `AnalysisResult` (module `scam`) |
   | POST | `/verify/claim` | `{ claim, context? }` | `AnalysisResult` (module `claim`) |
   | POST | `/analyze/image` | multipart `file` | `AnalysisResult` (module `image`) |
   | POST | `/analyze/video` | multipart `file` | `AnalysisResult` (module `video`, status `queued`) |
   | GET | `/analyze/video/{id}` | — | `AnalysisResult` (polling; additional proposal) |
   | GET | `/reports` | — | `{ reports: ReportResponse[] }` |
   | GET | `/reports/{id}` | — | `ReportResponse` |

3. Enable CORS for the frontend origin in FastAPI (`CORSMiddleware`).

The response shape is defined in `src/types/analysis.ts`. Key fields are `module`, `risk_score` (0–100, or `null` when no valid score was produced), `confidence` (0–1), `label`, `reasons`, `evidence`, `limitations`, `model_version`, `status`, `coverage`, timestamps and module `details`. Incoming JSON is validated and defaulted in `src/services/validation.ts`, which also accepts confidence on a 0–100 scale. If the backend is unreachable or times out, the app falls back to the demo engines and tells the user.

Risk levels: **Low 0–29 · Medium 30–59 · High 60–79 · Critical 80–100**.

## Project structure

```
src/
  app/                 routes (landing, (app)/dashboard, analyze, results, reports, settings)
  components/          ui primitives, layout shell, charts, risk visuals, result blocks
  features/            landing, dashboard, analysis, scam, verification,
                       image-analysis, video-analysis, reports, settings
  lib/                 risk thresholds, unified scoring, formatting, media helpers
  lib/demo/            labelled demo engines + sample seed data
  services/            analysis-service (demo ⇄ API), api client/endpoints/contracts, validation
  store/               local store (useSyncExternalStore + localStorage)
  types/               shared data contract
```

## Unified score

`max(confidence-weighted mean of valid module scores, 0.85 × highest module score)`. Failed, insufficient-coverage, unscored and missing modules are excluded and listed. They are never treated as low risk. Overall confidence is reduced when fewer modules contribute.
