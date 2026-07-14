import type { PersistedConversation } from "@/lib/intelligence-store";
import type { OverviewMetrics } from "./types";
import type { MessageStats } from "./messages";
import { qualityToScore, qualityScoreToPercent, safeMean, isQualified } from "./util";

export function calculateOverview(
  records: PersistedConversation[],
  messageStats?: MessageStats
): OverviewMetrics {
  const leads = records.filter((r) => r.lead);
  const conversations = records.filter((r) => r.conversation);

  const avgLeadScore = safeMean(leads.map((r) => r.lead!.leadScore));
  const avgEngagement = safeMean(conversations.map((r) => r.conversation!.engagementScore));
  const qualityScores = conversations.map((r) => qualityToScore(r.conversation!.conversationQuality));
  const avgQualityScore = qualityScoreToPercent(safeMean(qualityScores));

  const qualifiedLeads = leads.filter((r) => isQualified(r.lead!.qualification)).length;

  return {
    totalConversations: records.length,
    totalLeads: leads.length,
    qualifiedLeads,
    avgLeadScore: Math.round(avgLeadScore),
    avgEngagement: Math.round(avgEngagement),
    avgQualityScore,
    avgConversationDurationMin: messageStats ? messageStats.avgDurationMin : null,
    avgMessages: messageStats ? messageStats.avgMessages : null,
    avgResponseLength: messageStats ? messageStats.avgResponseLength : null
  };
}
