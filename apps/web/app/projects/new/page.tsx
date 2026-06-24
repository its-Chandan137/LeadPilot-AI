import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/projects/new");
  }

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { name: true } }, user: { select: { name: true, email: true } } }
  });

  if (!membership) {
    redirect("/signup");
  }

  const userName = membership.user.name ?? user.email?.split("@")[0] ?? "Owner";

  return (
    <DashboardLayout userName={userName} workspaceName={membership.workspace.name}>
      <div className="mx-auto max-w-[480px]">
        <Link className="text-sm font-semibold text-[#7C3AED]" href="/projects">
          ← Back to projects
        </Link>
        <section className="mt-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-[#E5E7EB]">
          <h1 className="text-2xl font-bold text-[#111827]">Create a new project</h1>
          <p className="mt-2 text-sm text-[#6B7280]">Add your website to get your embed snippet</p>
          <div className="mt-6">
            <NewProjectForm />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
