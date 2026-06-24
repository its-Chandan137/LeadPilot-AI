"use client";

import {
  BarChart3,
  Bot,
  ChevronDown,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Settings,
  Settings2,
  Shield,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./sidebar-nav-item";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/widget-settings", label: "Widget Settings", icon: Settings2 },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar({
  workspaceName,
  userName
}: {
  workspaceName: string;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#E5E7EB] bg-white lg:flex">
      <div className="flex h-full flex-col px-4 py-6">
        <Link className="flex items-center gap-3 px-2 text-2xl font-bold text-[#7C3AED]" href="/dashboard">
          <Bot className="h-9 w-9" />
          <span>LeadPilot AI</span>
        </Link>

        <button className="mt-8 flex w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left shadow-sm" type="button">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
            <Shield className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#111827]">{workspaceName}</span>
            <span className="mt-1 inline-flex rounded-full bg-[#EDE9FE] px-2 py-0.5 text-xs font-medium text-[#5B21B6]">Growth Plan</span>
          </span>
          <ChevronDown className="h-4 w-4 text-[#6B7280]" />
        </button>

        <nav className="mt-5 grid gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <SidebarNavItem href={item.href} key={item.href} label={item.label} isActive={isActive}>
                <Icon className={cn("h-5 w-5", isActive ? "text-[#7C3AED]" : "text-[#6B7280]")} />
              </SidebarNavItem>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827]">Widget Status</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-[#10B981]">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                Active
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">Your widget is live on N websites</p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-[#7C3AED]" href="/projects">
              View Websites →
            </Link>
          </div>

          <button className="flex w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left shadow-sm" type="button">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EDE9FE] text-sm font-bold text-[#7C3AED]">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#111827]">{userName}</span>
              <span className="text-xs text-[#6B7280]">Owner</span>
            </span>
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
