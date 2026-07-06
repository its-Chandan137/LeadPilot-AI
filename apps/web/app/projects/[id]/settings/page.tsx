import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { id: true, name: true } } }
  });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, widgetConfig: true }
  });

  if (!project || !membership) redirect("/projects");

  return (
    <DashboardLayout
      workspaceName={membership.workspace.name}
      userName={user.email ?? "User"}
    >
      <SettingsForm
        projectId={project.id}
        projectName={project.name}
        widgetConfig={(project.widgetConfig as Record<string, unknown>) ?? {}}
      />
    </DashboardLayout>
  );
}
