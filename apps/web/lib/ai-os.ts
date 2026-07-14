import type { BotObjective } from "@leadpilot/types";
import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
} from "@/lib/ai-response";
import type { LeadEvaluation } from "@/lib/lead-scoring";
import type { ConversationIntelligence } from "@/lib/conversation-intelligence";
import type { ActionEngineOutput } from "@/lib/action-engine";
import type { GoalEngineOutput } from "@/lib/goal-engine";
import type { StrategyEngineOutput } from "@/lib/strategy-engine";
import type { BusinessProfile, CRMProfile } from "@/lib/crm-intelligence";
import type { SalesBrainDecision } from "@/lib/sales-brain";
import type { AnalyticsSnapshot } from "@/lib/analytics-intelligence";
import type { ConversationEvent } from "@/lib/timeline-engine";

import { evaluateLead } from "@/lib/lead-scoring";
import { buildConversationIntelligence } from "@/lib/conversation-intelligence";
import { decideGoal } from "@/lib/goal-engine";
import { decideStrategy } from "@/lib/strategy-engine";
import { decideAction } from "@/lib/action-engine";
import { decideSalesMission } from "@/lib/sales-brain";
import { buildBusinessProfile, buildCrmProfile } from "@/lib/crm-intelligence";
import { buildAnalyticsSnapshot } from "@/lib/analytics-intelligence";
import { buildTimelineEvents } from "@/lib/timeline-engine";

export interface AIOSInput {
  conversationId: string;
  history: { role: "user" | "assistant"; content: string }[];
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  configuredObjectives: BotObjective[];
}

/** The complete internal representation of a single conversation turn. */
export interface LeadPilotAIOS {
  memory: ConversationMemory;
  business: BusinessProfile;
  conversation: ConversationIntelligence;
  lead: LeadEvaluation;
  state: { stage?: string };
  goal: GoalEngineOutput;
  strategy: StrategyEngineOutput;
  nextAction: ActionEngineOutput;
  salesDecision: SalesBrainDecision;
  crm: CRMProfile;
  analytics: AnalyticsSnapshot;
  timeline: ConversationEvent[];
}

/**
 * The internal AI Operating System. Runs every engine in pipeline order and
 * returns a single unified object. Pure except for the in-memory stores used
 * by the action/timeline/analytics engines (which are backend-only caches).
 */
export function runAIOS(input: AIOSInput): LeadPilotAIOS {
  const { conversationId, history, memory, analysis, recommendation, configuredObjectives } = input;

  // 2. Business intelligence (derived from memory + analysis).
  const business = buildBusinessProfile(memory, analysis);

  // 4. Lead scoring (needed before conversation intelligence for signals).
  const lead = evaluateLead({
    objectives: configuredObjectives,
    memory,
    analysis,
    recommendation,
  });

  // 3. Conversation intelligence.
  const conversation = buildConversationIntelligence({
    memory,
    analysis,
    recommendation,
    leadScore: lead.score,
    qualification: lead.qualification,
    completedObjectives: lead.completedObjectives,
    pendingObjectives: lead.pendingObjectives,
    history,
  });

  // 5. State manager.
  const state = { stage: analysis?.visitorStage };

  // 6. Goal engine.
  const goal = decideGoal({
    memory,
    analysis,
    recommendation,
    leadScore: lead.score,
    qualification: lead.qualification,
    state: state.stage,
    history,
    configuredObjectives,
  });

  // 7. Strategy engine.
  const strategy = decideStrategy({
    goal: goal.goal,
    memory,
    analysis,
    recommendation,
    leadScore: lead.score,
    qualification: lead.qualification,
    business,
  });

  // 8. Next best action.
  const nextAction = decideAction({
    conversationId,
    memory,
    analysis,
    recommendation,
    leadScore: lead.score,
    qualification: lead.qualification,
    objectives: configuredObjectives,
    completedObjectives: lead.completedObjectives,
    pendingObjectives: lead.pendingObjectives,
    history,
  });

  // 9. Sales brain.
  const salesDecision = decideSalesMission({
    goal,
    strategy,
    memory,
    analysis,
    recommendation,
    lead,
    conversation,
    business,
  });

  // 10. CRM intelligence.
  const crm = buildCrmProfile({
    memory,
    analysis,
    recommendation,
    lead,
    conversation,
    goal,
    strategy,
    nextAction,
    business,
  });

  // 11. Analytics intelligence.
  const analytics = buildAnalyticsSnapshot({
    conversationId,
    memory,
    analysis,
    recommendation,
    lead,
    conversation,
    goal,
    nextAction,
    crm,
  });

  // 12. Timeline events.
  const timeline = buildTimelineEvents({
    conversationId,
    memory,
    analysis,
    recommendation,
    lead,
    goal,
    nextAction,
  });

  return {
    memory,
    business,
    conversation,
    lead,
    state,
    goal,
    strategy,
    nextAction,
    salesDecision,
    crm,
    analytics,
    timeline,
  };
}
