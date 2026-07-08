"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SidebarContext = React.createContext<{ collapsed: boolean }>({ collapsed: false });
export const useSidebar = () => React.useContext(SidebarContext);

type CollapsibleSidebarProps = {
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
};

export function CollapsibleSidebar({ children, collapsed, onToggle }: CollapsibleSidebarProps) {
  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <aside
        className={`fixed h-screen bg-white border-r border-[#E5E7EB] flex flex-col transition-all duration-200 z-30 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <button
          onClick={onToggle}
          className="absolute right-0 top-20 translate-x-1/2 w-6 h-6 rounded-full bg-white border border-[#7C3AED] flex items-center justify-center hover:bg-[#F5F3FF] transition-colors z-10"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-[#7C3AED]" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-[#7C3AED]" />
          )}
        </button>
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}
