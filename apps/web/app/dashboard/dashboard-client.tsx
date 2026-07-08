"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Users, FolderKanban, BookOpen, MessageCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = {
  conversations: number;
  messages: number;
  leads: number;
  projects: number;
  knowledgeSources: number;
};

type TrendPoint = { date: string; count: number };

type RecentConversation = {
  id: string;
  visitorId: string;
  projectName: string;
  lastMessage: string | null;
  lastMessageAt: string;
  createdAt: string;
};

type RecentLead = {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  projectName: string;
  createdAt: string;
};

type ActivityItem = {
  id: string;
  type: "conversation" | "lead" | "knowledge";
  title: string;
  projectName: string;
  createdAt: string;
};

type DashboardData = {
  stats: Stats;
  conversationTrend: TrendPoint[];
  leadTrend: TrendPoint[];
  recentConversations: RecentConversation[];
  recentLeads: RecentLead[];
  recentActivity: ActivityItem[];
};

const statIcons: Record<keyof Stats, React.ReactNode> = {
  conversations: <MessageSquare className="w-5 h-5 text-[#7C3AED]" />,
  messages: <MessageCircle className="w-5 h-5 text-[#7C3AED]" />,
  leads: <Users className="w-5 h-5 text-[#7C3AED]" />,
  projects: <FolderKanban className="w-5 h-5 text-[#7C3AED]" />,
  knowledgeSources: <BookOpen className="w-5 h-5 text-[#7C3AED]" />,
};

const statLabels: Record<keyof Stats, string> = {
  conversations: "Total Conversations",
  messages: "Total Messages",
  leads: "Total Leads",
  projects: "Active Projects",
  knowledgeSources: "Knowledge Sources",
};

export function DashboardClient({
  workspaceName,
}: {
  workspaceName: string;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#F3F4F6] rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-[#F3F4F6] rounded animate-pulse" /></CardHeader>
              <CardContent><div className="h-8 w-16 bg-[#F3F4F6] rounded animate-pulse" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="h-40 bg-[#F3F4F6] rounded animate-pulse" /></CardContent></Card>)}</div>
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="h-32 bg-[#F3F4F6] rounded animate-pulse" /></CardContent></Card>)}</div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-500">Unable to load dashboard data.</p>;
  }

  const maxConversation = Math.max(...data.conversationTrend.map((p) => p.count), 1);
  const maxLead = Math.max(...data.leadTrend.map((p) => p.count), 1);

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">{workspaceName}</h1>
        </div>
        <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href="/projects">
          View projects
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        {(Object.keys(statLabels) as (keyof Stats)[]).map((key) => (
          <Card key={key}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">{statLabels[key]}</CardTitle>
              {statIcons[key]}
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-950">{data.stats[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Conversation Trend</CardTitle></CardHeader>
          <CardContent>
            {data.conversationTrend.every((p) => p.count === 0) ? (
              <p className="text-sm text-slate-400 text-center py-8">No conversations yet.</p>
            ) : (
              <div className="flex items-end gap-1.5 h-32">
                {data.conversationTrend.map((p) => (
                  <div key={p.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{p.count}</span>
                    <div
                      className="w-full rounded-t bg-[#7C3AED] transition-all"
                      style={{ height: `${Math.max((p.count / maxConversation) * 100, p.count > 0 ? 4 : 0)}%` }}
                    />
                    <span className="text-[10px] text-slate-400">
                      {new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Lead Trend</CardTitle></CardHeader>
          <CardContent>
            {data.leadTrend.every((p) => p.count === 0) ? (
              <p className="text-sm text-slate-400 text-center py-8">No leads yet.</p>
            ) : (
              <div className="flex items-end gap-1.5 h-32">
                {data.leadTrend.map((p) => (
                  <div key={p.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{p.count}</span>
                    <div
                      className="w-full rounded-t bg-[#7C3AED] transition-all"
                      style={{ height: `${Math.max((p.count / maxLead) * 100, p.count > 0 ? 4 : 0)}%` }}
                    />
                    <span className="text-[10px] text-slate-400">
                      {new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Recent Conversations</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.recentConversations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 px-6">No conversations yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentConversations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/projects`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-950 truncate">
                        {`Visitor ${c.visitorId.slice(-6).toUpperCase()}`}
                      </p>
                      <p className="text-xs text-[#7C3AED] truncate">{c.projectName}</p>
                      {c.lastMessage && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Recent Leads</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 px-6">No leads yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentLeads.map((l) => (
                  <div key={l.id} className="px-6 py-3">
                    <p className="text-sm font-medium text-slate-950 truncate">{l.name ?? "Unnamed"}</p>
                    <p className="text-xs text-slate-500 truncate">{l.email ?? "No email"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#7C3AED] truncate">{l.projectName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {l.status}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Recent Activity</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 px-6">No activity yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentActivity.map((a) => (
                  <div key={`${a.type}-${a.id}`} className="px-6 py-3 flex items-start gap-3">
                    <div className={`mt-0.5 w-6 h-6 rounded-full grid place-items-center shrink-0 ${
                      a.type === "conversation" ? "bg-blue-100" :
                      a.type === "lead" ? "bg-green-100" : "bg-purple-100"
                    }`}>
                      {a.type === "conversation" ? (
                        <MessageSquare className={`w-3 h-3 ${a.type === "conversation" ? "text-blue-600" : ""}`} />
                      ) : a.type === "lead" ? (
                        <Users className="w-3 h-3 text-green-600" />
                      ) : (
                        <BookOpen className="w-3 h-3 text-purple-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-950 truncate">{a.title}</p>
                      <p className="text-xs text-[#7C3AED]">{a.projectName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
