import Link from "next/link";
import { ArrowRight, ArrowUpRight, ClipboardCheck, ScanSearch } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { MODULES, MODULE_IDS } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { LandingNav } from "./landing-nav";
import { ProductPreview } from "./product-preview";
import { Reveal } from "./reveal";

const FEATURE_POINTS: Record<string, string[]> = {
  scam: ["Urgency & payment-pressure cues", "Lookalike, punycode & shortened URLs", "Impersonation patterns"],
  claim: ["Checkability assessment", "Supporting vs. contradicting sources", "Gaps, conflicts & next steps"],
  image: ["Synthetic-media indicators", "Metadata & quality checks", "Artefact observations"],
  video: ["Frame sampling & face coverage", "Per-frame & temporal signals", "Asynchronous processing"],
};

const STEPS = [
  { title: "Submit content", body: "Paste a message or link, enter a claim, or add an image or video. Combine several in one investigation." },
  { title: "Review explainable signals", body: "Each module reports a 0–100 risk score, confidence, the evidence behind it and what it could not check." },
  { title: "Get a Digital Trust Report", body: "A unified report weighs only the modules that produced valid results, with clear next steps. Print or save as PDF." },
];

const PRINCIPLES = [
  { title: "Indicators, not verdicts", body: "ThreatDetector never labels content as definitively real, fake, true or false." },
  { title: "Confidence & coverage", body: "Every score shows how reliable it is and which checks did — and did not — run." },
  { title: "No silent gaps", body: "Failed or unassessed modules are excluded and disclosed, never counted as “safe”." },
  { title: "Privacy-aware by design", body: "In demo mode everything runs in your browser. Raw messages and media are never stored." },
];

const FACTS = [
  ["Modules", "4"],
  ["Risk scale", "0–100"],
  ["Confidence", "Every score"],
  ["Demo mode", "Runs locally"],
];

function SectionLabel({ index, children, className }: { index: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow flex items-center gap-3", className)}>
      <span className="text-accent">{index}</span>
      <span className="h-px w-8 bg-border-strong" aria-hidden />
      {children}
    </p>
  );
}

export function LandingPage() {
  return (
    <div className="ambient min-h-dvh overflow-x-clip">
      <LandingNav />

      <main id="main">
        {/* Hero */}
        <section className="relative border-b border-border">
          <div className="relative mx-auto grid grid-cols-1 max-w-7xl gap-14 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:px-8 lg:pt-20 lg:pb-24">
            <Reveal>
              <p className="eyebrow">Multi-modal digital risk assessment</p>
              <h1 className="mt-6 font-display text-[44px] leading-[0.98] font-semibold tracking-[-0.04em] text-fg sm:text-6xl lg:text-[76px]">
                Know what to trust{" "}
                <span className="text-muted">in a digital world.</span>
              </h1>
              <p className="mt-7 max-w-lg text-base leading-relaxed text-muted sm:text-[17px]">
                ThreatDetector AI assesses suspicious messages, links, claims, images and videos — then explains the evidence, the confidence behind
                it, and what it couldn&apos;t check. One unified Digital Trust Report, with safe next steps.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/analyze" size="lg">
                  <ScanSearch /> Analyze Content
                </ButtonLink>
                <ButtonLink href="/dashboard" size="lg" variant="secondary">
                  Explore Platform <ArrowRight />
                </ButtonLink>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <ProductPreview />
            </Reveal>
          </div>
          <dl className="relative mx-auto grid max-w-7xl grid-cols-2 border-t border-border sm:grid-cols-4">
            {FACTS.map(([k, v], i) => (
              <div key={k} className={cn("px-4 py-5 sm:px-6 lg:px-8", i > 0 && "sm:border-l sm:border-border", i % 2 === 1 && "border-l border-border")}>
                <dt className="eyebrow !text-[10px]">{k}</dt>
                <dd className="mt-1.5 font-display text-xl font-semibold tracking-[-0.02em] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Features */}
        <section id="platform" className="scroll-mt-20 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
              <div>
                <SectionLabel index="01">Platform</SectionLabel>
                <h2 className="mt-5 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl">
                  Four analysis modules.
                  <br />
                  One trust picture.
                </h2>
              </div>
              <p className="max-w-md text-muted lg:justify-self-end">
                Digital deception rarely arrives in one format. A scam message carries a link, a misleading claim, and a doctored image. ThreatDetector
                looks at each — and at how they fit together.
              </p>
            </Reveal>
            <ul className="mt-14 border-t border-border">
              {MODULE_IDS.map((id, i) => {
                const m = MODULES[id];
                const Icon = m.icon;
                return (
                  <li key={id} className="border-b border-border">
                    <Reveal delay={i * 0.05}>
                      <Link
                        href={m.href}
                        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-5 gap-y-3 py-7 transition-colors hover:bg-surface/60 sm:px-3 lg:grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-x-8"
                      >
                        <span className="pt-1 font-mono text-sm text-subtle lg:pt-0">0{i + 1}</span>
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
                            <Icon className={cn("size-5 shrink-0", m.accent)} aria-hidden />
                            {m.shortName}
                          </h3>
                          <p className="mt-2 max-w-md text-sm text-muted">{m.description}</p>
                        </div>
                        <ul className="col-span-full flex flex-wrap gap-1.5 lg:col-span-1">
                          {FEATURE_POINTS[id].map((p) => (
                            <li key={p} className="rounded-sm border border-border px-2 py-1 font-mono text-[11px] text-subtle">
                              {p}
                            </li>
                          ))}
                        </ul>
                        <span className="col-start-3 row-start-1 flex size-10 items-center justify-center rounded-full border border-border text-muted transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent lg:col-start-4">
                          <ArrowUpRight className="size-4" aria-hidden />
                          <span className="sr-only">Try {m.shortName}</span>
                        </span>
                      </Link>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-bg-2 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionLabel index="02">How it works</SectionLabel>
              <h2 className="mt-5 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl">
                From suspicion to a clear next step
              </h2>
            </Reveal>
            <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0">
              {STEPS.map((s, i) => (
                <li key={s.title} className={cn("md:px-8", i === 0 && "md:pl-0", i > 0 && "md:border-l md:border-border")}>
                  <Reveal delay={i * 0.08}>
                    <span className="font-display text-6xl leading-none font-semibold tracking-[-0.04em] text-border-strong">0{i + 1}</span>
                    <h3 className="mt-6 text-lg font-semibold text-fg">{s.title}</h3>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{s.body}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Responsible AI */}
        <section id="responsible-ai" className="scroll-mt-20 py-20 lg:py-28">
          <div className="mx-auto grid grid-cols-1 max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:px-8">
            <Reveal>
              <SectionLabel index="03">Responsible AI & privacy</SectionLabel>
              <h2 className="mt-5 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl">
                Built to inform judgement — not replace it.
              </h2>
              <p className="mt-5 max-w-md text-muted">
                Detection models make mistakes, and new manipulation techniques appear constantly. ThreatDetector is designed around that reality:
                transparent signals, stated uncertainty and honest coverage.
              </p>
              <div className="mt-8 border-l-[3px] border-ai py-1 pl-4">
                <p className="eyebrow !text-ai">What the demo does today</p>
                <p className="mt-2 max-w-md text-sm text-muted">
                  This build runs transparent rule-based checks for messages and URLs, and clearly-labelled simulations for claim evidence, image and
                  video detection — ready to be replaced by the AI backend.
                </p>
              </div>
            </Reveal>
            <dl className="grid grid-cols-1 border-t border-border sm:grid-cols-2">
              {PRINCIPLES.map((p, i) => (
                <Reveal
                  key={p.title}
                  delay={i * 0.06}
                  className={cn("border-b border-border py-7 sm:px-6", i % 2 === 0 ? "sm:pl-0" : "sm:border-l sm:border-border")}
                >
                  <dt className="flex items-baseline gap-3 font-semibold text-fg">
                    <span className="font-mono text-xs text-accent">{String.fromCharCode(65 + i)}.</span>
                    {p.title}
                  </dt>
                  <dd className="mt-2 pl-6 text-sm leading-relaxed text-muted">{p.body}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-accent text-on-accent">
          <Reveal className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-20">
            <div>
              <h2 className="max-w-2xl font-display text-4xl leading-[1.02] font-semibold tracking-[-0.035em] sm:text-5xl">
                Got something that doesn&apos;t feel right?
              </h2>
              <p className="mt-4 max-w-lg opacity-75">Run it through ThreatDetector and get an explainable risk assessment in seconds.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/analyze"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-on-accent px-5 text-[15px] font-semibold text-accent transition-transform hover:-translate-y-px [&_svg]:size-4"
              >
                <ScanSearch aria-hidden /> Analyze Content
              </Link>
              <Link
                href="/reports"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-on-accent/30 px-5 text-[15px] font-medium transition-colors hover:bg-on-accent/10 [&_svg]:size-4"
              >
                <ClipboardCheck aria-hidden /> View sample reports
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="bg-bg-2">
        <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted">AI-powered digital trust & threat detection. A final-year project demonstration.</p>
          </div>
          {[
            { title: "Analyze", links: MODULE_IDS.map((id) => ({ href: MODULES[id].href, label: MODULES[id].shortName })) },
            {
              title: "Workspace",
              links: [
                { href: "/dashboard", label: "Overview" },
                { href: "/analyze", label: "New analysis" },
                { href: "/reports", label: "Reports history" },
              ],
            },
            {
              title: "About",
              links: [
                { href: "/#responsible-ai", label: "Responsible AI" },
                { href: "/#how-it-works", label: "How it works" },
                { href: "/settings", label: "Privacy & data" },
              ],
            },
          ].map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-6 text-xs leading-relaxed text-subtle sm:px-6 lg:px-8">
            <p>
              <span className="font-medium text-muted">Limitations:</span> ThreatDetector AI provides risk indicators with stated confidence and
              limitations. It cannot prove that content is real, fake, true or false, and may miss new or sophisticated manipulation. This demo build
              uses rule-based heuristics and clearly-labelled simulated outputs; no accuracy figures are claimed. Always verify important decisions
              through independent, trusted sources.
            </p>
            <p className="mt-3 font-mono">© {new Date().getFullYear()} ThreatDetector AI · Final-year project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
