"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  Settings2,
  BarChart3,
  FolderKanban,
  Shield,
  LogOut,
  Search,
  ChevronDown,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CollapsibleSidebar, useSidebar } from "./collapsible-sidebar";

type ProjectSidebarProps = {
  workspaceName: string;
  userName: string;
  projectId: string;
  projectName: string;
  collapsed: boolean;
  onToggle: () => void;
  allProjects: { id: string; name: string }[];
};

function isActive(pathname: string, href: string) {
  if (href === pathname) return true;
  return pathname.startsWith(href + "/") || pathname.startsWith(href + "#");
}

export function ProjectSidebar({ workspaceName, userName, projectId, projectName, collapsed, onToggle, allProjects }: ProjectSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const baseHref = `/projects/${projectId}`;

  const navItems = [
    { href: `${baseHref}/overview`, label: "Project Overview", icon: LayoutDashboard },
    { href: `${baseHref}/conversations`, label: "Conversations", icon: MessageSquare },
    { href: `${baseHref}/leads`, label: "Leads", icon: Users },
    { href: `${baseHref}/knowledge-base`, label: "Knowledge Base", icon: BookOpen },
    { href: `${baseHref}/widget-settings`, label: "Widget Settings", icon: Settings2 },
    { href: `${baseHref}/analytics`, label: "Analytics", icon: BarChart3, comingSoon: true },
    { href: `${baseHref}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <CollapsibleSidebar collapsed={collapsed} onToggle={onToggle}>
      <InnerSidebar
        workspaceName={workspaceName}
        userName={userName}
        projectName={projectName}
        projectId={projectId}
        pathname={pathname}
        navItems={navItems}
        onSignOut={handleSignOut}
        baseHref={baseHref}
        allProjects={allProjects}
      />
    </CollapsibleSidebar>
  );
}

function InnerSidebar({
  workspaceName,
  userName,
  projectName,
  projectId,
  pathname,
  navItems,
  onSignOut,
  baseHref,
  allProjects,
}: {
  workspaceName: string;
  userName: string;
  projectName: string;
  projectId: string;
  pathname: string;
  navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; comingSoon?: boolean }[];
  onSignOut: () => void;
  baseHref: string;
  allProjects: { id: string; name: string }[];
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
            <span className="font-semibold text-sm text-[#111827] truncate">{workspaceName}</span>
          )}
        </div>
        {!collapsed && (
          <span className="inline-block text-xs bg-[#7C3AED] text-white rounded-full px-2 py-0.5">
            Growth Plan
          </span>
        )}
      </div>

      {/* Project selector dropdown */}
      {collapsed ? (
        <div className="mx-3 my-2 p-3 flex justify-center">
          <FolderKanban className="w-4 h-4 text-[#7C3AED]" />
        </div>
      ) : (
        <ProjectSelector
          projects={allProjects}
          currentProjectId={projectId}
          currentProjectName={projectName}
        />
      )}

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
      </div>

      {/* Bottom section */}
      <div className="mt-auto">
        {/* Widget status */}
        {collapsed ? (
          <div className="mx-3 mb-3 p-3 flex justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        ) : (
          <div className="mx-3 mb-2 mt-2 p-2 rounded-lg border border-[#E5E7EB] bg-white">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-medium text-[#111827]">Active</span>
              <span className="text-[10px] text-[#6B7280]">· Widget is live</span>
            </div>
            <Link href="/projects" className="text-[10px] text-[#7C3AED] font-medium hover:underline">
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

function ProjectSelector({
  projects,
  currentProjectId,
  currentProjectName,
}: {
  projects: { id: string; name: string }[];
  currentProjectId: string;
  currentProjectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(
    () =>
      projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [projects, search]
  );

  function handleSelect(projectId: string) {
    setOpen(false);
    setSearch("");
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(/\/projects\/[^/]+/, `/projects/${projectId}`);
    router.push(newPath);
  }

  return (
    <div ref={ref} className="relative mx-3 my-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center gap-2 hover:bg-[#EDE9FE] transition-colors"
      >
        <FolderKanban className="w-4 h-4 text-[#7C3AED] shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs text-[#6B7280]">Current Project</p>
          <p className="text-sm font-semibold text-[#111827] truncate leading-tight">{currentProjectName}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-white border border-[#E5E7EB] shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#E5E7EB]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#E5E7EB] outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#EDE9FE]"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#9CA3AF]">No projects found</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    p.id === currentProjectId
                      ? "bg-[#EDE9FE] text-[#7C3AED] font-medium"
                      : "text-[#6B7280] hover:bg-[#F5F3FF]"
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{p.name}</span>
                  {p.id === currentProjectId && (
                    <span className="ml-auto text-[10px] text-[#7C3AED]">Active</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
