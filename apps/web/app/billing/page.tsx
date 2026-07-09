import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
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

  return (
    <DashboardLayout
      workspaceName={membership?.workspace.name ?? "My Workspace"}
      userName={user.user_metadata?.name ?? user.email ?? "User"}
    >
      <h1 className="text-3xl font-semibold">Billing</h1>
      <p className="mt-1 text-slate-600">Manage your subscription and billing.</p>
      <div className="mt-8 rounded-lg border bg-white p-12 text-center">
        <p className="text-lg font-medium text-slate-950">Coming Soon</p>
        <p className="mt-2 text-slate-500">Billing and subscription management will be available soon.</p>
      </div>
    </DashboardLayout>
  );
}
