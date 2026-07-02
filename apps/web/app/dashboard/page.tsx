import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

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
    include: {
      workspace: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!membership) {
    redirect("/signup");
  }

  return (
    <DashboardLayout
      workspaceName={membership.workspace.name}
      userName={user.user_metadata?.name ?? user.email ?? "User"}
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient
          workspaceName={membership.workspace.name}
          userName={user.email ?? "User"}
        />
      </Suspense>
    </DashboardLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-[#F3F4F6] rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
            <div className="h-4 w-24 bg-[#F3F4F6] rounded animate-pulse" />
            <div className="mt-3 h-8 w-16 bg-[#F3F4F6] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
            <div className="h-40 bg-[#F3F4F6] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
            <div className="h-32 bg-[#F3F4F6] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
