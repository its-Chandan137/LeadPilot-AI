import { HomeLayout } from "@/components/layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user!.id },
    include: { workspace: { select: { id: true, name: true } } },
  });

  const projects = await prisma.project.findMany({
    where: { workspaceId: membership!.workspace.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <HomeLayout>
      <LeadsClient projects={projects} />
    </HomeLayout>
  );
}
