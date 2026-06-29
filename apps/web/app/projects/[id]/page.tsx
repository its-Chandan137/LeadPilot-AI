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
    include: { workspace: true }
  });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, clientId: true }
  });

  if (!project) {
    redirect("/projects");
  }

  return (
    <DashboardLayout
      workspaceName={membership?.workspace.name ?? "My Workspace"}
      userName={user.user_metadata?.name ?? user.email ?? "User"}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="mt-1 text-slate-600">Client ID: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">{project.clientId}</code></p>
        </div>
        <Link className="rounded-md border px-4 py-2 text-sm" href="/projects">Back to Projects</Link>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white" href={`/projects/${project.id}/snippet`}>View Snippet</Link>
        <Link className="rounded-md border px-4 py-2 text-sm" href="/projects">Back to Projects</Link>
      </div>
    </DashboardLayout>
  );
}
