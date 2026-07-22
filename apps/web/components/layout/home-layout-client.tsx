"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { HomeSidebar } from "./home-sidebar";
import { Breadcrumbs } from "./breadcrumbs";

type HomeLayoutClientProps = {
  children: React.ReactNode;
  workspaceName: string;
  userName: string;
};

export function HomeLayoutClient({ children, workspaceName, userName }: HomeLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lp-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  function handleToggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("lp-sidebar-collapsed", String(next));
      return next;
    });
  }

  const marginLeft = collapsed ? "ml-16" : "md:ml-64";

  return (
    <div className="flex min-h-screen bg-[#F5F3FF]">
      <HomeSidebar workspaceName={workspaceName} userName={userName} collapsed={collapsed} onToggle={handleToggle} />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${marginLeft}`}>
        <header className="bg-white border-b border-[#E5E7EB] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <Breadcrumbs />
          <div className="flex items-center gap-3">
            <button className="text-[#6B7280] hover:text-[#111827] transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
