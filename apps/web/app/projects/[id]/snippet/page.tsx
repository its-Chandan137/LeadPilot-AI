import { CheckCircle2, Code2, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SnippetTabs } from "./snippet-tabs";

export const dynamic = "force-dynamic";

const helpCards = [
  { title: "Paste before </body>", body: "Install the snippet near the end of your page so it loads after your content.", icon: Code2 },
  { title: "Keep the client ID", body: "The client ID connects this website to the correct LeadPilot project.", icon: CheckCircle2 },
  { title: "Need help?", body: "Send this guide to your developer or install it through your tag manager.", icon: LifeBuoy }
];

export default async function SnippetPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/projects/${params.id}/snippet`);
  }

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { name: true } }, user: { select: { name: true, email: true } } }
  });

  if (!membership) {
    redirect("/signup");
  }

  const project = await prisma.project.findFirst({
    where: { id: params.id, workspaceId: membership.workspaceId },
    select: { name: true, siteUrl: true, clientId: true }
  });

  if (!project) {
    notFound();
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const userName = membership.user.name ?? user.email?.split("@")[0] ?? "Owner";

  return (
    <DashboardLayout userName={userName} workspaceName={membership.workspace.name}>
      <Link className="text-sm font-semibold text-[#7C3AED]" href="/projects">
        ← Back to Projects
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">{project.name}</h1>
          <p className="mt-2 text-[#6B7280]">Installation Guide</p>
        </div>
        <div className="rounded-full bg-[#F3F4F6] px-4 py-2 font-mono text-sm text-[#374151]">Client ID: {project.clientId}</div>
      </div>

      <div className="mt-6">
        <SnippetTabs appUrl={appUrl} clientId={project.clientId} />
      </div>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
        <h2 className="text-lg font-bold text-[#111827]">Need help?</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {helpCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="rounded-xl border border-[#E5E7EB] p-4" key={card.title}>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#EDE9FE] text-[#7C3AED]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-[#111827]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">{card.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </DashboardLayout>
  );
}
