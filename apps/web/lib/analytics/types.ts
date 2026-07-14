import type { PersistedConversation } from "@/lib/intelligence-store";

export type AnalyticsRange = "today" | "yesterday" | "7d" | "30d" | "90d" | "all";

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" }
];

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface FunnelStage {
  label: string;
  value: number;
  /** Conversion relative to the first (top) stage, as a percentage. */
  conversion: number;
}

export type InsightSeverity = "info" | "warning" | "positive";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
}

export interface OverviewMetrics {
  totalConversations: number;
  totalLeads: number;
  qualifiedLeads: number;
  avgLeadScore: number;
  avgEngagement: number;
  avgQualityScore: number;
  avgConversationDurationMin: number | null;
  avgMessages: number | null;
  avgResponseLength: number | null;
}

export interface LeadMetrics {
  funnel: FunnelStage[];
  scoreDistribution: NamedValue[];
  qualificationBreakdown: NamedValue[];
  engagementBreakdown: NamedValue[];
  topScoreReasons: NamedValue[];
  avgScore: number;
}

export interface ConversationMetrics {
  stageDistribution: NamedValue[];
  qualityDistribution: NamedValue[];
  avgEngagement: number;
  duration: { avg: number | null; min: number | null; max: number | null };
  avgGoalProgress: number | null;
  topGoals: NamedValue[];
  topStrategies: NamedValue[];
  objectiveCompletion: { avgCompleted: number; avgPending: number; topCompleted: NamedValue[] };
}

export interface KnowledgeMetrics {
  topTopics: NamedValue[];
  topPainPoints: NamedValue[];
  topObjections: NamedValue[];
  positiveSignals: NamedValue[];
  knowledgeGaps: NamedValue[];
  /** Always empty: per-question retrieval quality is not tracked in the persisted layer. */
  unmetQuestions: NamedValue[];
}

export interface EngagementMetrics {
  engagementOverTime: SeriesPoint[];
  qualityOverTime: SeriesPoint[];
  distribution: NamedValue[];
}

export interface JourneyMetrics {
  stageDistribution: NamedValue[];
  qualificationProgression: NamedValue[];
  dropOff: { reachedHot: number; didNotReachHot: number; mostCommonExit: string };
  funnel: FunnelStage[];
}

export interface AnalyticsReport {
  scope: "global" | "project";
  projectId?: string;
  range: AnalyticsRange;
  overview: OverviewMetrics;
  leads: LeadMetrics;
  conversations: ConversationMetrics;
  knowledge: KnowledgeMetrics;
  engagement: EngagementMetrics;
  journey: JourneyMetrics;
  insights: Insight[];
  generatedAt: string;
}
