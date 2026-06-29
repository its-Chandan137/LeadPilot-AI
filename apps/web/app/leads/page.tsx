import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { mockLeads } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
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
      <h1 className="text-3xl font-semibold">Leads</h1>
      <p className="mt-1 text-slate-600">Track and manage your leads.</p>

      {mockLeads.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-white p-12 text-center">
          <p className="text-slate-500">No leads yet. Leads will appear here as visitors engage with your widget.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-5 py-3 font-medium text-slate-600">Name</th>
                <th className="px-5 py-3 font-medium text-slate-600">Email</th>
                <th className="px-5 py-3 font-medium text-slate-600">Phone</th>
                <th className="px-5 py-3 font-medium text-slate-600">Source</th>
                <th className="px-5 py-3 font-medium text-slate-600">Score</th>
                <th className="px-5 py-3 font-medium text-slate-600">Status</th>
                <th className="px-5 py-3 font-medium text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {mockLeads.map((lead) => (
                <tr className="border-b last:border-b-0" key={lead.id}>
                  <td className="px-5 py-3 font-medium text-slate-950">{lead.name}</td>
                  <td className="px-5 py-3 text-slate-600">{lead.email}</td>
                  <td className="px-5 py-3 text-slate-600">{lead.phone}</td>
                  <td className="px-5 py-3 text-slate-600">{lead.source}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      lead.score === "Hot" ? "bg-red-100 text-red-700" :
                      lead.score === "Warm" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      lead.status === "New" ? "bg-blue-100 text-blue-700" :
                      lead.status === "Contacted" ? "bg-gray-100 text-gray-700" :
                      lead.status === "Qualified" ? "bg-green-100 text-green-700" :
                      "bg-green-200 text-green-800"
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{lead.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
