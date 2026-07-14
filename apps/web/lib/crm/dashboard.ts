import { Prisma } from "@prisma/client";
import { getSharedPrismaClient } from "@/lib/prisma";
import { getAllPersisted, getAllPersistedForProject } from "@/lib/intelligence-store";
import { getEnrichedLeads } from "./leads";
import { getActivityFeed } from "./activity";
import { getPersistedIntelligence } from "./intelligence";
import type {
  DashboardData,
  ActivityEvent,
  EnrichedLead,
  NamedValue,
  FunnelStage,
  TrendPoint,
  RecentRecommendation,
  PersistedIntelligence
} from "./types";

function bump(map: Map<string, number>, key?: string | null) {
  const k = key?.trim();
  if (!k) return;
  map.set(k, (map.get(k) ?? 0) + 1);
}

function topN(entries: [string, number][], n = 6): NamedValue[] {
  return entries
    .filter(([k]) => k)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name, value }));
}

function buildFunnel(records: { intel: PersistedIntelligence }[]): FunnelStage[] {
  const total = records.length;
  const engaged = records.filter((r) => (r.intel.conversation?.engagementScore ?? 0) >= 40).length;
  const qualified = records.filter((r) => {
    const q = (r.intel.lead?.qualification ?? "").toLowerCase();
    return q === "warm" || q === "hot";
  }).length;
  const hot = records.filter((r) => (r.intel.lead?.qualification ?? "").toLowerCase() === "hot").length;
  const contact = records.filter((r) => {
    const a = (r.intel.lead?.recommendedAction ?? "").toLowerCase();
    return a.includes("contact") || a.includes("demo");
  }).length;
  const base = total || 1;
  return [
    { label: "Visitors", value: total, conversion: 100 },
    { label: "Engaged", value: engaged, conversion: Math.round((engaged / base) * 100) },
    { label: "Qualified", value: qualified, conversion: Math.round((qualified / base) * 100) },
    { label: "Hot", value: hot, conversion: Math.round((hot / base) * 100) },
    { label: "Contact Ready", value: contact, conversion: Math.round((contact / base) * 100) }
  ];
}

async function getScopeRecords(workspaceId: string, projectId?: string) {
  const prisma = getSharedPrismaClient();
  const projectIds = projectId
    ? [projectId]
    : (await prisma.project.findMany({ where: { workspaceId }, select: { id: true } })).map((p) => p.id);

  const all = projectId
    ? await getAllPersistedForProject(projectId)
    : await getAllPersisted();
  const scoped = all.filter((r) => !r.projectId || projectIds.includes(r.projectId));

  return Promise.all(
    scoped.map(async (r) => ({ intel: await getPersistedIntelligence(r.conversationId) }))
  );
}

function fillDayGaps(raw: { date: Date; count: number }[], days: number): TrendPoint[] {
  const result: TrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const match = raw.find((r) => r.date.toISOString().slice(0, 10) === dateStr);
    result.push({ date: dateStr, count: match?.count ?? 0 });
  }
  return result;
}

export async function getLiveDashboard(opts: {
  workspaceId: string;
  projectId?: string;
}): Promise<DashboardData> {
  const prisma = getSharedPrismaClient();
  const projectIds = opts.projectId
    ? [opts.projectId]
    : (await prisma.project.findMany({ where: { workspaceId: opts.workspaceId }, select: { id: true } })).map((p) => p.id);
  const scope = opts.projectId ? "project" : "global";
  const projectFilter = opts.projectId ? Prisma.sql`"projectId" = ${opts.projectId}` : Prisma.sql`"projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${opts.workspaceId})`;

  const [todayConversations, todayLeads, warmLeads, hotLeads, leadTrend, conversationTrend] = await Promise.all([
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "Conversation" WHERE ${projectFilter} AND "createdAt" >= CURRENT_DATE`,
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "Lead" WHERE ${projectFilter} AND "createdAt" >= CURRENT_DATE`,
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "Lead" WHERE ${projectFilter} AND score = CAST('WARM' AS "LeadScore")`,
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "Lead" WHERE ${projectFilter} AND score = CAST('HOT' AS "LeadScore")`,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE("createdAt") AS date, COUNT(*)::int AS count FROM "Lead"
      WHERE ${projectFilter} AND "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE("createdAt") ORDER BY date`,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE("createdAt") AS date, COUNT(*)::int AS count FROM "Conversation"
      WHERE ${projectFilter} AND "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE("createdAt") ORDER BY date`
  ]);

  const records = await getScopeRecords(opts.workspaceId, opts.projectId);

  const industries = new Map<string, number>();
  const businessTypes = new Map<string, number>();
  const products = new Map<string, number>();
  const painPoints = new Map<string, number>();
  const goals = new Map<string, number>();
  const recommendedActions = new Map<string, number>();
  const engagementVals: number[] = [];
  const scoreVals: number[] = [];

  for (const r of records) {
    const intel = r.intel;
    bump(industries, intel.business?.industry);
    bump(businessTypes, intel.business?.businessType);
    for (const p of intel.business?.products ?? []) bump(products, p);
    for (const p of intel.conversation?.painPoints ?? []) bump(painPoints, p);
    for (const g of intel.conversation?.goals ?? []) bump(goals, g);
    bump(recommendedActions, intel.lead?.recommendedAction);
    if (intel.conversation) engagementVals.push(intel.conversation.engagementScore);
    if (intel.lead) scoreVals.push(intel.lead.leadScore);
  }

  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);

  const recentLeadsRes = await getEnrichedLeads({
    workspaceId: opts.workspaceId,
    projectId: opts.projectId,
    limit: 50
  });
  const scored = recentLeadsRes.leads
    .map((l) => ({ l, score: l.intelligence.lead?.leadScore ?? -1 }))
    .sort((a, b) => b.score - a.score);
  const recentHighValueLeads: EnrichedLead[] = scored.slice(0, 5).map((s) => s.l);

  const recentRecommendations: RecentRecommendation[] = recentLeadsRes.leads
    .filter((l) => l.intelligence.lead?.recommendedAction)
    .slice(0, 5)
    .map((l) => ({
      conversationId: l.conversationId ?? l.id,
      visitorId: l.visitorId,
      projectName: l.project.name,
      leadName: l.name,
      recommendedAction: l.intelligence.lead!.recommendedAction,
      score: l.score,
      createdAt: l.createdAt
    }));

  const activity: ActivityEvent[] = await getActivityFeed({
    workspaceId: opts.workspaceId,
    projectIds: projectIds,
    projectId: opts.projectId,
    limit: 12
  });

  return {
    scope: scope as "global" | "project",
    today: {
      conversations: todayConversations[0]?.count ?? 0,
      leads: todayLeads[0]?.count ?? 0,
      warm: warmLeads[0]?.count ?? 0,
      hot: hotLeads[0]?.count ?? 0,
      avgEngagement: avg(engagementVals),
      avgLeadScore: avg(scoreVals)
    },
    topIndustries: topN([...industries.entries()]),
    topBusinessTypes: topN([...businessTypes.entries()]),
    topProducts: topN([...products.entries()]),
    topPainPoints: topN([...painPoints.entries()]),
    topGoals: topN([...goals.entries()]),
    topRecommendedActions: topN([...recommendedActions.entries()]),
    qualificationFunnel: buildFunnel(records),
    leadTrend: fillDayGaps(leadTrend, 7),
    conversationTrend: fillDayGaps(conversationTrend, 7),
    recentHighValueLeads,
    recentRecommendations,
    activity
  };
}
