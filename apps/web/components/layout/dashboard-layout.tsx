"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Users,
  BarChart3,
  Settings2,
  Plug,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  Shield,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLoader } from "@/components/ui/brand-loader";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/widget-settings", label: "Widget Settings", icon: Settings2 },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/projects": "Projects",
  "/conversations": "Conversations",
  "/leads": "Leads",
  "/knowledge": "Knowledge Base",
  "/analytics": "Analytics",
  "/widget-settings": "Widget Settings",
  "/integrations": "Integrations",
  "/billing": "Billing",
  "/settings": "Settings",
};

type DashboardLayoutProps = {
  children: React.ReactNode;
  workspaceName: string;
  userName: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function DashboardLayout({ children, workspaceName, userName }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [pathname]);

  const currentTitle = pageTitles[pathname] ?? "Dashboard";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {loading && <BrandLoader />}
      <div className="flex min-h-screen bg-[#F5F3FF]">
        <aside className="fixed w-64 h-screen bg-white border-r border-[#E5E7EB] flex flex-col overflow-y-auto">
          {/* Logo */}
          <div className="px-5 pt-6 pb-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
                <span className="text-white font-bold text-sm">LP</span>
              </div>
              <span className="font-bold text-xl text-[#7C3AED]">LeadPilot AI</span>
            </Link>
            <div className="mt-4 border-b border-[#E5E7EB]" />
          </div>

          {/* Workspace card */}
          <div className="mx-3 my-3 p-3 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE]">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-[#7C3AED]" />
              <span className="font-semibold text-sm text-[#111827] truncate">{workspaceName}</span>
            </div>
            <span className="inline-block text-xs bg-[#7C3AED] text-white rounded-full px-2 py-0.5">
              Growth Plan
            </span>
          </div>

          {/* Menu label */}
          <p className="px-5 mt-4 mb-1 text-[10px] font-semibold text-[#9CA3AF] tracking-widest">MENU</p>

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
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="mt-auto">
            {/* Widget status */}
            <div className="mx-3 mb-3 mt-2 p-3 rounded-xl border border-[#E5E7EB] bg-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-[#111827]">Active</span>
              </div>
              <p className="text-xs text-[#6B7280] mb-2">Widget is live</p>
              <Link href="/projects" className="text-xs text-[#7C3AED] font-medium hover:underline">
                View Projects &rarr;
              </Link>
            </div>

            {/* User profile */}
            <div className="mx-3 mb-4 p-3 rounded-xl border border-[#E5E7EB] bg-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-bold text-sm grid place-items-center">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111827] truncate">{userName}</p>
                <p className="text-xs text-[#6B7280]">Owner</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right side */}
        <div className="flex-1 flex flex-col ml-64">
          {/* Top header bar */}
          <header className="bg-white border-b border-[#E5E7EB] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <h1 className="text-lg font-semibold text-[#111827]">{currentTitle}</h1>
            <div className="flex items-center gap-3">
              <button className="text-[#6B7280] hover:text-[#111827] transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-px h-5 bg-[#E5E7EB]" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm font-medium text-[#6B7280] hover:text-[#EF4444] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
