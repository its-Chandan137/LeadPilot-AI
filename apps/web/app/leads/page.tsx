import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { id: true, name: true } } },
  });
  if (!membership) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { workspaceId: membership.workspace.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <DashboardLayout
      workspaceName={membership.workspace.name}
      userName={user.email ?? "User"}
    >
      <Suspense fallback={
        <div className="flex h-[calc(100vh-8rem)] -mx-8 -mb-6">
          <div className="w-[380px] border-r border-[#E5E7EB] bg-white">
            <div className="p-4 border-b space-y-3">
              <div className="h-9 bg-[#F3F4F6] rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="flex-1 h-9 bg-[#F3F4F6] rounded animate-pulse" />
                <div className="flex-1 h-9 bg-[#F3F4F6] rounded animate-pulse" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-[#F3F4F6] rounded w-3/4" />
                  <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
                  <div className="h-3 bg-[#F3F4F6] rounded w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-[#F5F3FF] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-[#EDE9FE] border-t-[#7C3AED] animate-spin" />
          </div>
        </div>
      }>
        <LeadsClient projects={projects} />
      </Suspense>
    </DashboardLayout>
  );
}
