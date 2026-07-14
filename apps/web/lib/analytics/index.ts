import {
  getAllPersisted,
  getAllPersistedForProject,
  type PersistedConversation
} from "@/lib/intelligence-store";
import type { AnalyticsReport, AnalyticsRange } from "./types";
import { applyRange } from "./util";
import { calculateOverview } from "./overview";
import { computeMessageStats } from "./messages";
import { calculateLeadMetrics } from "./leads";
import { calculateConversationMetrics } from "./conversations";
import { calculateKnowledgeMetrics } from "./knowledge";
import { calculateEngagementMetrics } from "./engagement";
import { calculateJourneyMetrics } from "./journey";
import { buildInsights } from "./summary";

export type {
  AnalyticsReport,
  AnalyticsRange,
  Insight,
  NamedValue,
  SeriesPoint,
  FunnelStage,
  OverviewMetrics,
  LeadMetrics,
  ConversationMetrics,
  KnowledgeMetrics,
  EngagementMetrics,
  JourneyMetrics
} from "./types";

export { RANGE_OPTIONS } from "./types";

/**
 * Aggregates all persisted conversation intelligence into a single report.
 * Reads only from the persistence layer — no new AI, no behaviour changes.
 */
export async function getAnalytics(opts: { projectId?: string; range?: AnalyticsRange } = {}): Promise<AnalyticsReport> {
  const range = opts.range ?? "all";
  const scope = opts.projectId ? "project" : "global";

  const all: PersistedConversation[] = opts.projectId
    ? await getAllPersistedForProject(opts.projectId)
    : await getAllPersisted();

  const records = applyRange(all, range);

  const messageStats = await computeMessageStats({
    range,
    projectId: opts.projectId,
    conversationIds: records.map((r) => r.conversationId)
  });
  const overview = calculateOverview(records, messageStats);
  const leads = calculateLeadMetrics(records);
  const conversations = calculateConversationMetrics(records);
  const knowledge = calculateKnowledgeMetrics(records);
  const engagement = calculateEngagementMetrics(records);
  const journey = calculateJourneyMetrics(records);
  const insights = buildInsights(overview, leads, knowledge, engagement, journey);

  return {
    scope,
    projectId: opts.projectId,
    range,
    overview,
    leads,
    conversations,
    knowledge,
    engagement,
    journey,
    insights,
    generatedAt: new Date().toISOString()
  };
}
