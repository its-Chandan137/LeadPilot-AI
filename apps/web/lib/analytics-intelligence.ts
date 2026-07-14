import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
} from "@/lib/ai-response";
import type { ConversationIntelligence } from "@/lib/conversation-intelligence";
import type { LeadEvaluation } from "@/lib/lead-scoring";
import type { GoalEngineOutput } from "@/lib/goal-engine";
import type { ActionEngineOutput } from "@/lib/action-engine";
import type { CRMProfile } from "@/lib/crm-intelligence";

export interface AnalyticsSnapshot {
  conversationQuality: string;
  engagementScore: number;
  goalProgress: number;
  topIntent: string;
  productsMentioned: string[];
  painPoints: string[];
  objections: string[];
  visitorJourney: string[];
  qualificationHistory: string[];
  leadTrend: number[];
  recommendedBusinessAction: string;
}

export interface AnalyticsIntelligenceInput {
  conversationId: string;
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  lead: LeadEvaluation;
  conversation: ConversationIntelligence;
  goal: GoalEngineOutput;
  nextAction: ActionEngineOutput;
  crm: CRMProfile;
}

// In-memory per-conversation history (no DB yet).
const scoreHistory = new Map<string, number[]>();
const qualificationHistory = new Map<string, string[]>();

function recordHistory(conversationId: string, score: number, qualification: string) {
  const scores = scoreHistory.get(conversationId) ?? [];
  scores.push(score);
  scoreHistory.set(conversationId, scores.slice(-20));

  const quals = qualificationHistory.get(conversationId) ?? [];
  quals.push(qualification);
  qualificationHistory.set(conversationId, quals.slice(-20));
}

/** Builds an analytics snapshot after every message. Powers future dashboards. */
export function buildAnalyticsSnapshot(input: AnalyticsIntelligenceInput): AnalyticsSnapshot {
  const { conversationId, memory, analysis, lead, conversation, goal, nextAction, crm } = input;

  recordHistory(conversationId, lead.score, lead.qualification);

  const completed = lead.completedObjectives.length;
  const total = completed + lead.pendingObjectives.length;
  const goalProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const visitorJourney = [
    "Started",
    analysis?.visitorStage ?? "researching",
    goal.goal,
    lead.qualification,
  ].filter(Boolean);

  return {
    conversationQuality: conversation.conversationQuality,
    engagementScore: conversation.engagementScore,
    goalProgress,
    topIntent: analysis?.intent ?? "general",
    productsMentioned: memory.productsInterested ?? [],
    painPoints: memory.painPoints ?? [],
    objections: conversation.objections ?? [],
    visitorJourney,
    qualificationHistory: qualificationHistory.get(conversationId) ?? [lead.qualification],
    leadTrend: scoreHistory.get(conversationId) ?? [lead.score],
    recommendedBusinessAction: nextAction.action,
  };
}
