import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ConversationsClient } from "./conversations-client";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true }
  });

  if (!membership) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId: membership.workspaceId },
    select: { id: true, name: true }
  });

  return (
    <DashboardLayout
      workspaceName={membership.workspace.name}
      userName={user.email ?? "User"}
    >
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-4 border-[#EDE9FE] border-t-[#7C3AED] animate-spin" /></div>}>
        <ConversationsClient projects={projects} />
      </Suspense>
    </DashboardLayout>
  );
}
