"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CollapsibleSidebar, useSidebar } from "./collapsible-sidebar";

type HomeSidebarProps = {
  workspaceName: string;
  userName: string;
  collapsed: boolean;
  onToggle: () => void;
};

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/leads", label: "All Leads", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings, comingSoon: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function HomeSidebar({ workspaceName, userName, collapsed, onToggle }: HomeSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <CollapsibleSidebar collapsed={collapsed} onToggle={onToggle}>
      <InnerSidebar
        workspaceName={workspaceName}
        userName={userName}
        pathname={pathname}
        onSignOut={handleSignOut}
      />
    </CollapsibleSidebar>
  );
}

function InnerSidebar({
  workspaceName,
  userName,
  pathname,
  onSignOut,
}: {
  workspaceName: string;
  userName: string;
  pathname: string;
  onSignOut: () => void;
}) {
  const { collapsed } = useSidebar();

  return (
    <>
      {/* Logo section */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">LP</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-xl text-[#7C3AED]">LeadPilot AI</span>
          )}
        </Link>
        <div className="mt-4 border-b border-[#E5E7EB]" />
      </div>

      {/* Workspace card */}
      <div className={`mx-3 my-3 p-3 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] ${collapsed ? "flex justify-center" : ""}`}>
        <div className={`flex items-center gap-2 ${collapsed ? "" : "mb-1"}`}>
          <Shield className="w-4 h-4 text-[#7C3AED] shrink-0" />
          {!collapsed && (
            <>
              <span className="font-semibold text-sm text-[#111827] truncate">{workspaceName}</span>
            </>
          )}
        </div>
        {!collapsed && (
          <span className="inline-block text-xs bg-[#7C3AED] text-white rounded-full px-2 py-0.5">
            Growth Plan
          </span>
        )}
      </div>

      {/* Menu label */}
      {!collapsed && (
        <p className="px-5 mt-4 mb-1 text-[10px] font-semibold text-[#9CA3AF] tracking-widest">MENU</p>
      )}

      {/* Nav items */}
      <nav className="px-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative overflow-hidden flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-[#EDE9FE] text-[#7C3AED] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-[#7C3AED] before:rounded-r-full"
                  : "text-[#6B7280] hover:bg-[#F5F3FF] hover:text-[#7C3AED]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <div className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.comingSoon && (
                    <span className="text-[10px] font-medium text-[#7C3AED] bg-[#EDE9FE] rounded-full px-1.5 py-0.5 leading-none">
                      Coming Soon
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto">
        {/* Widget status */}
        {collapsed ? (
          <div className="mx-3 mb-3 p-3 flex justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        ) : (
          <div className="mx-3 mb-3 p-3 rounded-xl border border-[#E5E7EB] bg-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-[#111827]">Active</span>
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Widget is live</p>
            <Link href="/projects" className="text-xs text-[#7C3AED] font-medium hover:underline">
              View Projects &rarr;
            </Link>
          </div>
        )}

        {/* User profile */}
        {collapsed ? (
          <div className="mx-3 mb-4 p-3 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-bold text-sm grid place-items-center">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="mx-3 mb-4 p-3 rounded-xl border border-[#E5E7EB] bg-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-bold text-sm grid place-items-center shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111827] truncate">{userName}</p>
              <p className="text-xs text-[#6B7280]">Owner</p>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="mx-3 mb-4">
          <button
            onClick={onSignOut}
            className={`w-full flex items-center gap-2 text-sm font-medium text-[#6B7280] hover:text-[#EF4444] transition-colors p-2 rounded-lg hover:bg-[#FEF2F2] ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </>
  );
}
