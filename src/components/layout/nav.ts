import { FileSearch, History, ImageIcon, LayoutDashboard, Link2, PlusCircle, Settings, Video, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/analyze", label: "New Analysis", icon: PlusCircle, exact: true },
    ],
  },
  {
    title: "Modules",
    items: [
      { href: "/analyze/scam", label: "Scam & URL Scanner", icon: Link2 },
      { href: "/analyze/claim", label: "Claim Verification", icon: FileSearch },
      { href: "/analyze/image", label: "Image Analysis", icon: ImageIcon },
      { href: "/analyze/video", label: "Video Analysis", icon: Video },
    ],
  },
  {
    title: "Records",
    items: [
      { href: "/reports", label: "Reports History", icon: History },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
