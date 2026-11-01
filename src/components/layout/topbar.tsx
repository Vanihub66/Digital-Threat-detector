"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, CircleUserRound, FlaskConical, Menu, Plus, ServerCog, Settings, Trash2, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isApiMode } from "@/services/analysis-service";
import { actions, useAppState, type AppNotification } from "@/store/app-store";
import { SidebarNav } from "./sidebar";
import { usePopover } from "./use-popover";

const TITLES: [RegExp, string][] = [
  [/^\/dashboard/, "Overview"],
  [/^\/analyze\/scam/, "Scam & URL Scanner"],
  [/^\/analyze\/claim/, "Claim Verification"],
  [/^\/analyze\/image/, "Image Analysis"],
  [/^\/analyze\/video/, "Video Analysis"],
  [/^\/analyze/, "New Analysis"],
  [/^\/results/, "Analysis Result"],
  [/^\/reports\/.+/, "Digital Trust Report"],
  [/^\/reports/, "Reports History"],
  [/^\/settings/, "Settings"],
];

const TONE_DOT: Record<AppNotification["tone"], string> = {
  info: "bg-info",
  success: "bg-low",
  warning: "bg-medium",
  danger: "bg-critical",
};

function Notifications() {
  const { notifications } = useAppState();
  const { open, setOpen, ref } = usePopover();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute top-2 right-2 flex size-2 rounded-full bg-accent ring-2 ring-bg" aria-hidden />
        )}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] animate-fade-up overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => actions.markNotificationsRead()} disabled={!unread}>
                <CheckCheck /> Mark read
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => actions.clearNotifications()} aria-label="Clear all notifications" disabled={!notifications.length}>
                <Trash2 />
              </Button>
            </div>
          </div>
          <ul className="scrollbar-thin max-h-96 overflow-y-auto">
            {notifications.length === 0 && <li className="px-4 py-10 text-center text-sm text-subtle">You&apos;re all caught up.</li>}
            {notifications.map((n) => {
              const body = (
                <div className="flex gap-3 px-4 py-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-border-strong" : TONE_DOT[n.tone])} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                    <p className="mt-1 text-[11px] text-subtle">{formatRelative(n.created_at)}</p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} className="border-b border-border last:border-0">
                  {n.href ? (
                    <Link href={n.href} onClick={() => setOpen(false)} className="block hover:bg-surface-2">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
        className="flex items-center gap-2 rounded-xl border border-border px-1.5 py-1.5 hover:bg-surface-2 sm:pr-3"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent font-mono text-[11px] font-semibold text-on-accent">
          DU
        </span>
        <span className="hidden text-sm text-fg sm:inline">Demo user</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 animate-fade-up overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-2xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Demo user</p>
            <p className="text-xs text-subtle">Local profile placeholder — no account or sign-in.</p>
          </div>
          <div className="p-1.5">
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
              <Settings className="size-4" /> Settings & privacy
            </Link>
            <Link href="/settings#profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
              <CircleUserRound className="size-4" /> Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "ThreatDetector AI";
  const api = isApiMode();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur-md sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
          <Menu />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg sm:text-[15px]">{title}</p>
        </div>
        <span className="hidden sm:block">
          {api ? (
            <Badge tone="accent">
              <ServerCog aria-hidden /> API mode
            </Badge>
          ) : (
            <Badge tone="ai" title="Analyses run with labelled demo engines in your browser">
              <FlaskConical aria-hidden /> Demo mode
            </Badge>
          )}
        </span>
        <span className="hidden md:block">
          <ButtonLink href="/analyze" size="sm">
            <Plus /> New analysis
          </ButtonLink>
        </span>
        <Notifications />
        <UserMenu />
      </header>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-fade-up flex-col border-r border-border bg-bg-2">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo href="/dashboard" />
              <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-border p-4 text-xs text-subtle">
              {api ? "Connected to configured backend (API mode)." : "Demo mode — results are simulated or rule-based and stored locally."}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
