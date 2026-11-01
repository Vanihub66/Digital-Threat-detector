"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";
import { NAV_SECTIONS, isActive } from "./nav";

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          {!collapsed ? (
            <p className="eyebrow mb-2 px-3 !text-[10px]">{section.title}</p>
          ) : (
            <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden />
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                      collapsed && "justify-center px-0",
                      active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
                    )}
                  >
                    {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] bg-accent" aria-hidden />}
                    <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-subtle group-hover:text-muted")} aria-hidden />
                    {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { preferences } = useAppState();
  const collapsed = preferences.sidebarCollapsed;
  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-bg-2 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center" : "px-5")}>
        <Logo href="/dashboard" collapsed={collapsed} />
      </div>
      <div className={cn("scrollbar-thin flex-1 overflow-y-auto py-5", collapsed ? "px-3" : "px-3")}>
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="border-t border-border p-3">
        {!collapsed && (
          <div className="mb-3 border-l-2 border-accent py-1 pl-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-fg">
              <ShieldCheck className="size-3.5 text-accent" aria-hidden />
              Local-first demo
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-subtle">
              Results are stored only in this browser. Uploaded media never leaves your device in demo mode.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => actions.setPreferences({ sidebarCollapsed: !collapsed })}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
