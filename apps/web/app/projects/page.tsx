import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState } from "@/components/projects/empty-state";
import { ProjectCard } from "@/components/projects/project-card";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/projects");
  }

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { name: true } }, user: { select: { name: true, email: true } } }
  });

  if (!membership) {
    redirect("/signup");
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, siteUrl: true, clientId: true, createdAt: true }
  });

  const userName = membership.user.name ?? user.email?.split("@")[0] ?? "Owner";

  return (
    <DashboardLayout userName={userName} workspaceName={membership.workspace.name}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Projects</h1>
          <p className="mt-2 text-[#6B7280]">Create and manage website widget installations.</p>
        </div>
        <Link className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5B21B6]" href="/projects/new">
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      )}
    </DashboardLayout>
  );
}
