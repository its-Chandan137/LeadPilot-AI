import { HomeLayout } from "@/components/layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user!.id },
    include: { workspace: { select: { name: true } } },
  });

  return (
    <HomeLayout>
      <DashboardClient workspaceName={membership?.workspace.name ?? "My Workspace"} />
    </HomeLayout>
  );
}
