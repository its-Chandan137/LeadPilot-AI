import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { ProjectLayoutClient } from "./project-layout-client";

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

export async function ProjectLayout({ children, params }: ProjectLayoutProps) {
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
    include: {
      workspace: {
        select: { id: true, name: true }
      }
    }
  });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true }
  });

  if (!project || !membership) {
    redirect("/projects");
  }

  const allProjects = await prisma.project.findMany({
    where: { workspaceId: membership.workspace.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <ProjectLayoutClient
      workspaceName={membership.workspace.name}
      userName={user.user_metadata?.name ?? user.email ?? "User"}
      projectId={project.id}
      projectName={project.name}
      allProjects={allProjects}
    >
      {children}
    </ProjectLayoutClient>
  );
}
