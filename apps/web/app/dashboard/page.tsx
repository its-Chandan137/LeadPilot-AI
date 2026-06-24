import { Calendar } from "lucide-react";
import { redirect } from "next/navigation";
import { LeadsChart } from "@/components/dashboard/leads-chart";
import { LiveConversations } from "@/components/dashboard/live-conversations";
import { RecentLeads } from "@/components/dashboard/recent-leads";
import { SourcesChart } from "@/components/dashboard/sources-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { dashboardStats } from "@/lib/mock-data";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
    include: { workspace: { select: { name: true } }, user: { select: { name: true, email: true } } }
  });

  if (!membership) {
    redirect("/signup");
  }

  const userName = membership.user.name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "John";

  return (
    <DashboardLayout userName={userName} workspaceName={membership.workspace.name}>
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Good morning, {userName}! 👋</h1>
            <p className="mt-2 text-[#6B7280]">Here's what's happening with your leads today.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#374151] shadow-sm">
            <Calendar className="h-4 w-4 text-[#6B7280]" />
            May 12 - May 19, 2024
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <StatCard change={stat.change} key={stat.label} label={stat.label} period={stat.period} value={stat.value} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <LeadsChart />
          <SourcesChart />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <RecentLeads />
          <LiveConversations />
        </section>
      </div>
    </DashboardLayout>
  );
}
