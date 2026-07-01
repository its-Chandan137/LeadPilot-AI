import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeClient } from "./knowledge-client";

export default async function KnowledgePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    select: { id: true, name: true, clientId: true }
  });

  return (
    <DashboardLayout
      workspaceName={membership.workspace.name}
      userName={user.email ?? "User"}
    >
      <KnowledgeClient projects={projects} />
    </DashboardLayout>
  );
}
