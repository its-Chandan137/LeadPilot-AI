import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/projects/${params.id}`);
  }

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { name: true } }, user: { select: { name: true, email: true } } }
  });

  if (!membership) {
    redirect("/signup");
  }

  const project = await prisma.project.findFirst({
    where: { id: params.id, workspaceId: membership.workspaceId },
    select: { id: true, name: true, clientId: true, siteUrl: true }
  });

  if (!project) {
    notFound();
  }

  const userName = membership.user.name ?? user.email?.split("@")[0] ?? "Owner";

  return (
    <DashboardLayout userName={userName} workspaceName={membership.workspace.name}>
      <Link className="text-sm font-semibold text-[#7C3AED]" href="/projects">
        ← Back to projects
      </Link>
      <section className="mt-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-[#E5E7EB]">
        <p className="text-sm font-medium text-[#6B7280]">Project</p>
        <h1 className="mt-2 text-3xl font-bold text-[#111827]">{project.name}</h1>
        <p className="mt-3 break-all text-sm text-[#6B7280]">{project.siteUrl}</p>
        <div className="mt-5 inline-flex rounded-full bg-[#F3F4F6] px-3 py-2 font-mono text-sm text-[#374151]">
          Client ID: {project.clientId}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5B21B6]" href={`/projects/${project.id}/snippet`}>
            Snippet
          </Link>
          <span className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#6B7280]">Settings coming soon</span>
        </div>
      </section>
    </DashboardLayout>
  );
}
