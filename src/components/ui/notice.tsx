import type { ReactNode } from "react";
import { Cpu, FlaskConical, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "warning" | "demo" | "ai" | "privacy";

const STYLES: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  info: { box: "border-info/25 border-l-info bg-info/[0.06] [&_.notice-icon]:text-info", icon: <Info /> },
  warning: { box: "border-medium/30 border-l-medium bg-medium/[0.07] [&_.notice-icon]:text-medium", icon: <TriangleAlert /> },
  demo: { box: "border-ai/25 border-l-ai bg-ai/[0.06] [&_.notice-icon]:text-ai", icon: <FlaskConical /> },
  ai: { box: "border-ai/25 border-l-ai bg-ai/[0.06] [&_.notice-icon]:text-ai", icon: <Cpu /> },
  privacy: { box: "border-accent/25 border-l-accent bg-accent/[0.05] [&_.notice-icon]:text-accent", icon: <ShieldCheck /> },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
  action,
  icon,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const s = STYLES[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border border-l-[3px] p-3.5 text-sm print-avoid-break", s.box, className)}>
      <span className="notice-icon mt-0.5 shrink-0 [&_svg]:size-4" aria-hidden>
        {icon ?? s.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-fg">{title}</p>}
        {children && <div className={cn("text-muted", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
