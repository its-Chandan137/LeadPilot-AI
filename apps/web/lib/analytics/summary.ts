import type { Insight, OverviewMetrics, LeadMetrics, KnowledgeMetrics, EngagementMetrics, JourneyMetrics } from "./types";

/**
 * Rule-based insights derived entirely from the aggregated metrics. No AI is
 * used; every insight is a direct reading of the numbers above.
 */
export function buildInsights(
  overview: OverviewMetrics,
  leads: LeadMetrics,
  knowledge: KnowledgeMetrics,
  engagement: EngagementMetrics,
  journey: JourneyMetrics
): Insight[] {
  const insights: Insight[] = [];

  if (overview.totalConversations === 0) {
    insights.push({
      id: "no-data",
      severity: "info",
      title: "No conversations yet",
      description:
        "Once visitors start chatting with your widget, intelligence will appear here automatically. No setup required."
    });
    return insights;
  }

  if (overview.avgEngagement > 0 && overview.avgEngagement < 45) {
    insights.push({
      id: "low-engagement",
      severity: "warning",
      title: "Engagement is below average",
      description: `Average engagement is ${overview.avgEngagement}/100. Consider refining your widget objective questions or knowledge base to keep visitors engaged.`
    });
  } else if (overview.avgEngagement >= 70) {
    insights.push({
      id: "high-engagement",
      severity: "positive",
      title: "Strong visitor engagement",
      description: `Average engagement is ${overview.avgEngagement}/100 — visitors are having productive conversations.`
    });
  }

  const cold = leads.qualificationBreakdown.find((q) => q.name === "Cold")?.value ?? 0;
  const totalLeads = leads.qualificationBreakdown.reduce((a, b) => a + b.value, 0);
  if (totalLeads > 0 && cold / totalLeads > 0.6) {
    insights.push({
      id: "many-cold",
      severity: "warning",
      title: "Most leads are still cold",
      description:
        "More than 60% of leads haven't qualified. Review your qualification objectives and the natural questions the AI asks."
    });
  }

  if (knowledge.knowledgeGaps.length > 0) {
    const top = knowledge.knowledgeGaps[0].name;
    insights.push({
      id: "knowledge-gap",
      severity: "info",
      title: "Knowledge gap detected",
      description: `Frequent objections or negative signals around "${top}". Add knowledge base content to address it proactively.`
    });
  }

  if (journey.dropOff.didNotReachHot >= journey.dropOff.reachedHot && journey.dropOff.reachedHot > 0) {
    insights.push({
      id: "dropoff",
      severity: "warning",
      title: "Leads drop before becoming hot",
      description: `${journey.dropOff.didNotReachHot} conversations did not reach Hot qualification. Most common exit stage: ${journey.dropOff.mostCommonExit}.`
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "healthy",
      severity: "positive",
      title: "Conversations look healthy",
      description:
        "Your widget is capturing and qualifying leads with balanced engagement. Keep monitoring trends over time."
    });
  }

  return insights;
}
