import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function DashboardLayout({
  children,
  workspaceName = "Demo Workspace",
  userName = "John Doe"
}: {
  children: ReactNode;
  workspaceName?: string;
  userName?: string;
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <Sidebar workspaceName={workspaceName} userName={userName} />
      <main className="min-h-screen overflow-y-auto bg-[#F9FAFB] px-5 py-6 lg:ml-60 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
