import { getSharedPrismaClient } from "@/lib/prisma";
import { MessageSquare, Users, BookOpen, Calendar, Globe, Fingerprint } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "./copy-button";
import { EmbedSnippetSelector } from "./embed-snippet-selector";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const prisma = getSharedPrismaClient();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, clientId: true, siteUrl: true, widgetConfig: true, createdAt: true },
  });

  let conversationCount = 0;
  let leadCount = 0;
  let knowledgeCount = 0;

  if (project) {
    try {
      conversationCount = await prisma.conversation.count({
        where: { projectId: project.id },
      });
    } catch {}
    try {
      leadCount = await prisma.lead.count({
        where: { projectId: project.id },
      });
    } catch {}
    try {
      knowledgeCount = await prisma.knowledgeSource.count({
        where: { projectId: project.id },
      });
    } catch {}
  }

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const stats = [
    { label: "Conversations", value: conversationCount, icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Leads", value: leadCount, icon: Users, color: "text-green-600", bg: "bg-green-100" },
    { label: "Knowledge Sources", value: knowledgeCount, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Created", value: project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : "—", icon: Calendar, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{project?.name ?? "Project"}</h1>
        {project && (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-[#9CA3AF]" />
              <span className="text-xs font-medium text-[#6B7280]">Client ID:</span>
              <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">{project.clientId}</code>
              <CopyButton value={project.clientId} />
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#9CA3AF]" />
              <span className="text-xs font-medium text-[#6B7280]">Site URL:</span>
              <span className="text-xs text-slate-600">{project.siteUrl || "Not set"}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/projects/${params.id}/knowledge-base`} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 transition-colors">
          Add Knowledge
        </Link>
        <Link href={`/projects/${params.id}/conversations`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-violet-400 hover:text-violet-600 transition-colors">
          View Conversations
        </Link>
        <Link href={`/projects/${params.id}/leads`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-violet-400 hover:text-violet-600 transition-colors">
          View Leads
        </Link>
      </div>

      {project && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Widget Embed Snippet</h2>
          <p className="text-sm text-slate-500 mb-4">
            Add this script tag to your website to enable the chat widget.
          </p>
          <EmbedSnippetSelector clientId={project.clientId} apiUrl={apiUrl} />
        </div>
      )}
    </div>
  );
}


