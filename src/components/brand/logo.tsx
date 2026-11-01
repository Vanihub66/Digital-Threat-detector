import Link from "next/link";
import { cn } from "@/lib/utils";

/** Viewfinder mark: four corner brackets around a target dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="5" fill="var(--accent)" />
      <path
        d="M7 12V7h5M20 7h5v5M25 20v5h-5M12 25H7v-5"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="2.4"
        strokeLinecap="square"
      />
      <circle cx="16" cy="16" r="3.2" fill="var(--on-accent)" />
    </svg>
  );
}

export function Logo({ href = "/", className, collapsed }: { href?: string; className?: string; collapsed?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg", className)} aria-label="ThreatDetector AI home">
      <LogoMark className="size-7" />
      {!collapsed && (
        <span className="font-display text-[17px] leading-none font-semibold tracking-[-0.02em] text-fg">
          Threat<span className="text-muted">Detector</span>
          <span className="ml-1.5 align-[2px] font-mono text-[10px] font-medium tracking-wider text-subtle">AI</span>
        </span>
      )}
    </Link>
  );
}
