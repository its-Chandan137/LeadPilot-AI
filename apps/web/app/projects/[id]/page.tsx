import Link from "next/link";
import { redirect } from "next/navigation";
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
    redirect("/login");
  }

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { id: true, name: true } } }
  });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, clientId: true }
  });

  if (!project || !membership) {
    redirect("/projects");
  }

  return (
    <DashboardLayout
      workspaceName={membership.workspace.name}
      userName={user.user_metadata?.name ?? user.email ?? "User"}
    >
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{project.name}</h1>
        <p className="mt-1 text-slate-600">Client ID: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">{project.clientId}</code></p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 transition-colors" href={`/projects/${project.id}/widget`}>Customize</Link>
          <Link className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-violet-400 hover:text-violet-600 transition-colors" href={`/projects/${project.id}/snippet`}>Snippet</Link>
          <Link className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center gap-1.5" href={`/projects/${project.id}/settings`}>
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
