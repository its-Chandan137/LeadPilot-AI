import { HomeLayout } from "@/components/layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";
import { DashboardWidgets } from "@/components/crm/DashboardWidgets";
import { GlobalSearch } from "@/components/crm/GlobalSearch";

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
      <div className="mt-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Search Intelligence</h2>
          <GlobalSearch />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Live Intelligence</h2>
          <DashboardWidgets />
        </div>
      </div>
    </HomeLayout>
  );
}
