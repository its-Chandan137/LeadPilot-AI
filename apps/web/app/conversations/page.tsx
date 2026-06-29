import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { mockConversations } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
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
      <h1 className="text-3xl font-semibold">Conversations</h1>
      <p className="mt-1 text-slate-600">View all chat and voice conversations.</p>

      {mockConversations.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-white p-12 text-center">
          <p className="text-slate-500">No conversations yet. They will appear here once visitors start chatting.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-5 py-3 font-medium text-slate-600">Visitor</th>
                <th className="px-5 py-3 font-medium text-slate-600">Type</th>
                <th className="px-5 py-3 font-medium text-slate-600">Date</th>
                <th className="px-5 py-3 font-medium text-slate-600">Intent</th>
                <th className="px-5 py-3 font-medium text-slate-600">Lead Score</th>
                <th className="px-5 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockConversations.map((conv) => (
                <tr className="border-b last:border-b-0" key={conv.id}>
                  <td className="px-5 py-3 font-medium text-slate-950">{conv.visitor}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {conv.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{conv.date}</td>
                  <td className="px-5 py-3 text-slate-600">{conv.intent}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      conv.score === "Hot" ? "bg-red-100 text-red-700" :
                      conv.score === "Warm" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {conv.score}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      conv.status === "Open" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {conv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
