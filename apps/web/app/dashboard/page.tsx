import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/settings", label: "Settings" }
];

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

  const [totalProjects, totalConversations, totalLeads] = await Promise.all([
    prisma.project.count({
      where: {
        workspaceId: membership.workspace.id
      }
    }),
    prisma.conversation.count({
      where: {
        project: {
          workspaceId: membership.workspace.id
        }
      }
    }),
    prisma.lead.count({
      where: {
        project: {
          workspaceId: membership.workspace.id
        }
      }
    })
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:border-b-0 lg:border-r">
          <Link className="text-lg font-semibold text-slate-950" href="/dashboard">
            LeadPilot AI
          </Link>
          <nav className="mt-8 grid gap-1">
            {navItems.map((item) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-8 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Workspace</p>
                <h1 className="mt-1 text-3xl font-semibold text-slate-950">{membership.workspace.name}</h1>
              </div>
              <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href="/projects">
                View projects
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Total Projects", totalProjects],
                ["Total Conversations", totalConversations],
                ["Total Leads", totalLeads]
              ].map(([label, value]) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-slate-950">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
