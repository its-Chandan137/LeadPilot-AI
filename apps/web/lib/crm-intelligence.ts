import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
} from "@/lib/ai-response";
import type { ConversationIntelligence } from "@/lib/conversation-intelligence";
import type { LeadEvaluation } from "@/lib/lead-scoring";
import type { GoalEngineOutput } from "@/lib/goal-engine";
import type { StrategyEngineOutput } from "@/lib/strategy-engine";
import type { ActionEngineOutput } from "@/lib/action-engine";

export interface BusinessProfile {
  type?: string;
  industry?: string;
  company?: string;
  useCase?: string;
}

export interface CRMProfile {
  lead: {
    name?: string;
    email?: string;
    phone?: string;
    score: number;
    qualification: string;
  };
  business: BusinessProfile;
  company?: string;
  industry?: string;
  qualification: string;
  score: number;
  objectives: { completed: string[]; pending: string[] };
  timeline?: string;
  products: string[];
  interests: string[];
  goals: string[];
  painPoints: string[];
  objections: string[];
  visitorStage?: string;
  conversationSummary: string;
  recommendedAction: string;
  engagement: number;
  lastUpdated: string;
}

export interface CrmIntelligenceInput {
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  lead: LeadEvaluation;
  conversation: ConversationIntelligence;
  goal: GoalEngineOutput;
  strategy: StrategyEngineOutput;
  nextAction: ActionEngineOutput;
  business: BusinessProfile;
}

/** Derives a lightweight business profile from memory + analysis. */
export function buildBusinessProfile(
  memory: ConversationMemory,
  analysis?: ConversationAnalysis
): BusinessProfile {
  return {
    type: memory.businessType,
    industry: memory.industry,
    company: memory.company,
    useCase: analysis?.intent,
  };
}

/**
 * Builds a unified CRM model from all engine outputs. Not persisted yet —
 * this object is the contract the future database layer will store.
 */
export function buildCrmProfile(input: CrmIntelligenceInput): CRMProfile {
  const { memory, analysis, lead, conversation, nextAction, business } = input;

  return {
    lead: {
      name: memory.name,
      email: memory.email,
      phone: memory.phone,
      score: lead.score,
      qualification: lead.qualification,
    },
    business,
    company: memory.company,
    industry: memory.industry,
    qualification: lead.qualification,
    score: lead.score,
    objectives: {
      completed: lead.completedObjectives,
      pending: lead.pendingObjectives,
    },
    timeline: memory.timeline,
    products: memory.productsInterested ?? [],
    interests: memory.productsInterested ?? [],
    goals: memory.goals ?? [],
    painPoints: memory.painPoints ?? [],
    objections: conversation.objections ?? [],
    visitorStage: analysis?.visitorStage,
    conversationSummary: conversation.summary,
    recommendedAction: nextAction.action,
    engagement: conversation.engagementScore,
    lastUpdated: new Date().toISOString(),
  };
}
