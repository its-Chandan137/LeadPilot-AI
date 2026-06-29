import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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
      <h1 className="text-3xl font-semibold">Settings</h1>
      <p className="mt-1 text-slate-600">Manage your account and workspace settings.</p>

      <div className="mt-8 grid gap-6">
        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Name</label>
              <p className="mt-1 text-slate-950">{user.user_metadata?.name ?? "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <p className="mt-1 text-slate-950">{user.email}</p>
            </div>
            <button className="rounded-md border px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed" disabled>
              Edit Profile (Coming Soon)
            </button>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Workspace</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Workspace Name</label>
              <p className="mt-1 text-slate-950">{membership?.workspace.name ?? "My Workspace"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Security</h2>
          <div className="mt-4">
            <button className="rounded-md border px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed" disabled>
              Change Password (Coming Soon)
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
