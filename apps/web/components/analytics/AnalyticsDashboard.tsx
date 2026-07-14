"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessagesSquare,
  Users,
  Target,
  Gauge,
  Sparkles,
  TrendingUp,
  LineChart as LineIcon
} from "lucide-react";
import { type AnalyticsReport, type AnalyticsRange } from "@/lib/analytics/types";
import { Panel } from "./Panel";
import { StatCard } from "./StatCard";
import { Insights } from "./Insights";
import { FilterBar } from "./FilterBar";
import { LineChart, DonutChart, BarList, Funnel, MiniStat, ChartEmpty } from "./charts";

export function AnalyticsDashboard({ projectId }: { projectId?: string }) {
  const [range, setRange] = useState<AnalyticsRange>("all");
  const [data, setData] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ range });
    if (projectId) params.set("projectId", projectId);
    fetch(`/api/analytics?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data as AnalyticsReport);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = !loading && data && data.overview.totalConversations === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {projectId ? "Project Analytics" : "Analytics"}
          </h1>
          <p className="text-sm text-slate-500">
            Intelligence automatically extracted from every conversation — no setup required.
          </p>
        </div>
        <FilterBar value={range} onChange={setRange} loading={loading} />
      </div>

      {loading && <DashboardSkeleton />}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-4">
            <LineIcon className="w-7 h-7 text-[#7C3AED]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">No analytics yet</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            When visitors start chatting with your widget, lead scores, engagement, and
            conversation intelligence will appear here automatically.
          </p>
        </div>
      )}

      {!loading && data && data.overview.totalConversations > 0 && (
        <div className="space-y-6">
          <OverviewSection data={data} />
          <Panel title="Insights" description="Derived automatically from your analytics — no configuration needed.">
            <Insights insights={data.insights} />
          </Panel>
          <LeadSection data={data} />
          <ConversationsSection data={data} />
          <EngagementSection data={data} />
          <JourneySection data={data} />
          <KnowledgeSection data={data} />
        </div>
      )}
    </div>
  );
}

function OverviewSection({ data }: { data: AnalyticsReport }) {
  const o = data.overview;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Conversations"
        value={o.totalConversations}
        icon={<MessagesSquare className="w-5 h-5" />}
      />
      <StatCard label="Leads" value={o.totalLeads} icon={<Users className="w-5 h-5" />} />
      <StatCard
        label="Qualified Leads"
        value={o.qualifiedLeads}
        icon={<Target className="w-5 h-5" />}
        hint={`${o.totalLeads ? Math.round((o.qualifiedLeads / o.totalLeads) * 100) : 0}% of leads`}
      />
      <StatCard
        label="Avg Lead Score"
        value={o.avgLeadScore}
        icon={<Gauge className="w-5 h-5" />}
        accent="text-[#7C3AED]"
      />
      <StatCard label="Avg Engagement" value={`${o.avgEngagement}`} icon={<TrendingUp className="w-5 h-5" />} />
      <StatCard label="Avg Quality" value={`${o.avgQualityScore}%`} icon={<Sparkles className="w-5 h-5" />} />
      <StatCard
        label="Avg Duration"
        value={`${o.avgConversationDurationMin}m`}
        hint="From first message to last"
      />
      <StatCard
        label="Avg Messages"
        value={o.avgMessages}
        hint="Per conversation"
      />
      <StatCard
        label="Avg Response Length"
        value={o.avgResponseLength !== null ? `${o.avgResponseLength} chars` : "—"}
        hint={o.avgResponseLength === null ? "Not tracked" : "Per bot reply"}
      />
    </div>
  );
}

function LeadSection({ data }: { data: AnalyticsReport }) {
  const l = data.leads;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Lead Conversion Funnel" description="Visitors through to contact-ready leads.">
        <Funnel stages={l.funnel} />
      </Panel>
      <Panel title="Lead Qualification" description="Cold, Warm, and Hot distribution.">
        <DonutChart data={l.qualificationBreakdown} />
      </Panel>
      <Panel title="Lead Score Distribution" description="Spread of AI lead scores (0–100).">
        <BarList data={l.scoreDistribution} />
      </Panel>
      <Panel title="Engagement Distribution" description="Low, Medium, High engagement tiers.">
        <DonutChart data={l.engagementBreakdown} />
      </Panel>
      <Panel title="Why Leads Score High" description="Most common qualification reasons." className="lg:col-span-2">
        <BarList data={l.topScoreReasons} emptyLabel="No score reasons captured yet" />
      </Panel>
    </div>
  );
}

function ConversationsSection({ data }: { data: AnalyticsReport }) {
  const c = data.conversations;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Visitor Stage" description="Where conversations currently sit.">
        <DonutChart data={c.stageDistribution} />
      </Panel>
      <Panel title="Conversation Quality" description="Good / Average / Poor mix.">
        <DonutChart data={c.qualityDistribution} />
      </Panel>
      <Panel title="Duration" description="Conversation length (minutes).">
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Avg" value={c.duration.avg !== null ? `${c.duration.avg}m` : "—"} />
          <MiniStat label="Min" value={c.duration.min !== null ? `${c.duration.min}m` : "—"} />
          <MiniStat label="Max" value={c.duration.max !== null ? `${c.duration.max}m` : "—"} />
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium text-slate-700">Avg Goal Progress</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {c.avgGoalProgress !== null ? `${c.avgGoalProgress}%` : "—"}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium text-slate-700">Objectives Completed (avg)</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {c.objectiveCompletion.avgCompleted}
            <span className="text-sm font-normal text-slate-400">
              {" "}/ {c.objectiveCompletion.avgPending} pending
            </span>
          </div>
        </div>
      </Panel>
      <Panel title="Top Goals" description="Most common current goals.">
        <BarList data={c.topGoals} emptyLabel="No goals captured yet" />
      </Panel>
      <Panel title="Top Strategies" description="Most common active strategies.">
        <BarList data={c.topStrategies} emptyLabel="No strategies captured yet" />
      </Panel>
      <Panel title="Completed Objectives" description="Objectives most often achieved.">
        <BarList data={c.objectiveCompletion.topCompleted} emptyLabel="No objectives completed yet" />
      </Panel>
    </div>
  );
}

function EngagementSection({ data }: { data: AnalyticsReport }) {
  const e = data.engagement;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Engagement Over Time" description="Average engagement per day.">
        <LineChart data={e.engagementOverTime} suffix="" />
      </Panel>
      <Panel title="Conversation Quality Over Time" description="Average quality score per day.">
        <LineChart data={e.qualityOverTime} suffix="%" />
      </Panel>
    </div>
  );
}

function JourneySection({ data }: { data: AnalyticsReport }) {
  const j = data.journey;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Qualification Journey" description="Started → Warm+ → Hot.">
        <Funnel stages={j.funnel} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Reached Hot" value={j.dropOff.reachedHot} />
          <MiniStat label="Did Not Reach Hot" value={j.dropOff.didNotReachHot} />
        </div>
        <div className="mt-3 text-sm text-slate-500">
          Most common exit stage:{" "}
          <span className="font-medium text-slate-800">{j.dropOff.mostCommonExit}</span>
        </div>
      </Panel>
      <Panel title="Visitor Stage Distribution" description="Final stage per conversation.">
        <DonutChart data={j.stageDistribution} />
      </Panel>
      <Panel title="Qualification Progression" description="Stage transitions observed." className="lg:col-span-2">
        <BarList data={j.qualificationProgression} emptyLabel="No stage transitions recorded yet" />
      </Panel>
    </div>
  );
}

function KnowledgeSection({ data }: { data: AnalyticsReport }) {
  const k = data.knowledge;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Panel title="Top Topics" description="Most discussed interests & products.">
        <BarList data={k.topTopics} emptyLabel="No topics captured yet" />
      </Panel>
      <Panel title="Pain Points" description="Problems visitors mention.">
        <BarList data={k.topPainPoints} emptyLabel="No pain points captured yet" />
      </Panel>
      <Panel title="Objections" description="Common objections raised.">
        <BarList data={k.topObjections} emptyLabel="No objections captured yet" />
      </Panel>
      <Panel title="Positive Signals" description="What's resonating with visitors.">
        <BarList data={k.positiveSignals} emptyLabel="No positive signals captured yet" />
      </Panel>
      <Panel title="Knowledge Gaps" description="Objections & negative signals to address.">
        <BarList data={k.knowledgeGaps} emptyLabel="No knowledge gaps detected" />
      </Panel>
      <Panel title="Unmet Questions" description="Retrieval gaps (not yet tracked).">
        <ChartEmpty label="Not tracked in current persistence layer" />
      </Panel>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg border border-slate-200 bg-white p-5">
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="mt-4 h-7 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-40 rounded-lg border border-slate-200 bg-white animate-pulse" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-56 rounded-lg border border-slate-200 bg-white animate-pulse" />
        ))}
      </div>
    </div>
  );
}
