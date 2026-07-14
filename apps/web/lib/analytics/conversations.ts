import type { PersistedConversation } from "@/lib/intelligence-store";
import type { ConversationMetrics, NamedValue } from "./types";
import { safeMean, topN, countBy, conversationDurationMinutes, lastNumericValue, capitalize } from "./util";

export function calculateConversationMetrics(records: PersistedConversation[]): ConversationMetrics {
  const withLead = records.filter((r) => r.lead);
  const withConv = records.filter((r) => r.conversation);

  const stageMap = countBy(withLead, (l) => capitalize(l.lead!.visitorStage));
  const stageDistribution: NamedValue[] = [...stageMap.entries()]
    .filter(([name]) => name && name !== "Unknown")
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const qualityMap = countBy(withConv, (c) => capitalize(c.conversation!.conversationQuality));
  const qualityOrder = ["Good", "Average", "Poor"];
  const qualityDistribution: NamedValue[] = qualityOrder
    .map((q) => ({ name: q, value: qualityMap.get(q) ?? 0 }))
    .concat(
      [...qualityMap.entries()]
        .filter(([k]) => !qualityOrder.includes(k))
        .map(([name, value]) => ({ name, value }))
    );

  const durations = records
    .map(conversationDurationMinutes)
    .filter((d): d is number => d !== null);

  const goalProgress = withConv
    .map((r) => lastNumericValue(r.analytics?.goalProgressHistory))
    .filter((v): v is number => v !== null);
  const avgGoalProgress = goalProgress.length ? Math.round(safeMean(goalProgress)) : null;

  const goalCounts = new Map<string, number>();
  for (const r of withLead) {
    const g = r.lead!.currentGoal?.trim();
    if (g) goalCounts.set(g, (goalCounts.get(g) ?? 0) + 1);
  }
  const topGoals = topN([...goalCounts.entries()], 6);

  const stratCounts = new Map<string, number>();
  for (const r of withLead) {
    const s = r.lead!.currentStrategy?.trim();
    if (s) stratCounts.set(s, (stratCounts.get(s) ?? 0) + 1);
  }
  const topStrategies = topN([...stratCounts.entries()], 6);

  const completedCounts = new Map<string, number>();
  let totalCompleted = 0;
  let totalPending = 0;
  for (const r of withLead) {
    totalCompleted += r.lead!.completedObjectives.length;
    totalPending += r.lead!.pendingObjectives.length;
    for (const o of r.lead!.completedObjectives) {
      const k = o?.trim();
      if (k) completedCounts.set(k, (completedCounts.get(k) ?? 0) + 1);
    }
  }
  const topCompleted = topN([...completedCounts.entries()], 6);

  return {
    stageDistribution,
    qualityDistribution,
    avgEngagement: Math.round(safeMean(withConv.map((r) => r.conversation!.engagementScore))),
    duration: {
      avg: durations.length ? Math.round(safeMean(durations)) : null,
      min: durations.length ? Math.round(Math.min(...durations)) : null,
      max: durations.length ? Math.round(Math.max(...durations)) : null
    },
    avgGoalProgress,
    topGoals,
    topStrategies,
    objectiveCompletion: {
      avgCompleted: records.length ? Math.round((totalCompleted / records.length) * 10) / 10 : 0,
      avgPending: records.length ? Math.round((totalPending / records.length) * 10) / 10 : 0,
      topCompleted
    }
  };
}
