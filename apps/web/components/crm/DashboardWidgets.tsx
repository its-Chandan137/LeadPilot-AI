"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarList, Funnel, ChartEmpty } from "@/components/analytics/charts";
import { ActivityFeed } from "./ActivityFeed";
import { QualificationBadge, ScoreBadge } from "./badges";
import type { DashboardData } from "@/lib/crm";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function DashboardWidgets({ projectId }: { projectId?: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    fetch(`/api/crm/dashboard?${params}`)
      .then((r) => r.json())
      .then((json) => json.success && setData(json.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-slate-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const leadTrend = data.leadTrend.map((t) => ({ date: t.date, value: t.count }));
  const convTrend = data.conversationTrend.map((t) => ({ date: t.date, value: t.count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Today's Conversations" value={data.today.conversations} />
        <Stat label="Today's Leads" value={data.today.leads} />
        <Stat label="Warm Leads" value={data.today.warm} hint="all-time" />
        <Stat label="Hot Leads" value={data.today.hot} hint="all-time" />
        <Stat label="Avg Engagement" value={data.today.avgEngagement} hint="/100" />
        <Stat label="Avg Lead Score" value={data.today.avgLeadScore} hint="/100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Qualification Funnel</CardTitle></CardHeader>
          <CardContent><Funnel stages={data.qualificationFunnel} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Live Activity</CardTitle></CardHeader>
          <CardContent><ActivityFeed events={data.activity} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Trend (7d)</CardTitle></CardHeader>
          <CardContent>{leadTrend.length ? <LineChart data={leadTrend} /> : <ChartEmpty />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Conversation Trend (7d)</CardTitle></CardHeader>
          <CardContent>{convTrend.length ? <LineChart data={convTrend} /> : <ChartEmpty />}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Industries</CardTitle></CardHeader>
          <CardContent><BarList data={data.topIndustries} emptyLabel="No data" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Business Types</CardTitle></CardHeader>
          <CardContent><BarList data={data.topBusinessTypes} emptyLabel="No data" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Products</CardTitle></CardHeader>
          <CardContent><BarList data={data.topProducts} emptyLabel="No data" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Most Common Pain Points</CardTitle></CardHeader>
          <CardContent><BarList data={data.topPainPoints} emptyLabel="No data" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Most Common Goals</CardTitle></CardHeader>
          <CardContent><BarList data={data.topGoals} emptyLabel="No data" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Recommended Actions</CardTitle></CardHeader>
          <CardContent><BarList data={data.topRecommendedActions} emptyLabel="No data" /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent High Value Leads</CardTitle></CardHeader>
          <CardContent>
            {data.recentHighValueLeads.length === 0 ? (
              <p className="text-xs text-slate-400">No leads with intelligence yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentHighValueLeads.map((l) => (
                  <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{l.name ?? `Visitor ${l.visitorId.slice(-6).toUpperCase()}`}</p>
                      <p className="text-xs text-slate-400 truncate">{l.project.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ScoreBadge value={String(l.intelligence.lead?.leadScore ?? "—")} />
                      <QualificationBadge value={l.intelligence.lead?.qualification} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent AI Recommendations</CardTitle></CardHeader>
          <CardContent>
            {data.recentRecommendations.length === 0 ? (
              <p className="text-xs text-slate-400">No recommendations yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentRecommendations.map((r, i) => (
                  <li key={i} className="py-2">
                    <p className="text-sm text-slate-800">{r.recommendedAction}</p>
                    <p className="text-xs text-slate-400">
                      {r.leadName ?? `Visitor ${r.visitorId.slice(-6).toUpperCase()}`} · {r.projectName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
