import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
} from "@/lib/ai-response";
import type { ConversationIntelligence } from "@/lib/conversation-intelligence";
import type { LeadEvaluation } from "@/lib/lead-scoring";
import type { GoalEngineOutput } from "@/lib/goal-engine";
import type { StrategyEngineOutput } from "@/lib/strategy-engine";
import type { BusinessProfile } from "@/lib/crm-intelligence";

export interface SalesBrainDecision {
  currentMission: string;
  reason: string;
  confidence: number;
  alternativeMission: string;
}

export interface SalesBrainInput {
  goal: GoalEngineOutput;
  strategy: StrategyEngineOutput;
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  lead: LeadEvaluation;
  conversation: ConversationIntelligence;
  business: BusinessProfile;
}

/**
 * Central decision maker. It answers the internal sales questions and produces
 * a single current mission plus a fallback. Pure — depends only on inputs.
 */
export function decideSalesMission(input: SalesBrainInput): SalesBrainDecision {
  const { goal, strategy, memory, analysis, lead, conversation, business } = input;

  const known = [
    memory.name && "name",
    memory.email && "email",
    memory.phone && "phone",
    memory.company && "company",
    (memory.painPoints?.length ?? 0) > 0 && "pain points",
    (memory.goals?.length ?? 0) > 0 && "goals",
  ].filter(Boolean) as string[];

  const interest =
    analysis?.intent === "pricing" ||
    analysis?.intent === "sales" ||
    analysis?.intent === "product_information";

  const trust = lead.qualification === "Hot" ? "high" : lead.qualification === "Warm" ? "moderate" : "low";

  const reasonParts: string[] = [];
  reasonParts.push(`Visitor goal is "${goal.goal}" with a ${strategy.strategy} style.`);
  if (interest) reasonParts.push("Visitor shows product/pricing interest.");
  reasonParts.push(`Trust is ${trust}.`);
  if (known.length) reasonParts.push(`Known: ${known.join(", ")}.`);
  if ((memory.painPoints?.length ?? 0) > 0) reasonParts.push("Pain points captured.");

  // Mission: combine the goal with lead readiness.
  let currentMission = goal.goal;
  let alternativeMission = "Answer More Questions";

  if (goal.goal === "Offer Demo" || goal.goal === "Offer Booking" || goal.goal === "Offer Contact" || goal.goal === "Offer Pricing") {
    currentMission = goal.goal;
    alternativeMission = "Educate";
  } else if (lead.qualification === "Hot") {
    currentMission = "Close Conversation";
    alternativeMission = goal.goal;
  } else if (goal.goal === "Understand Visitor" || goal.goal === "Discover Needs") {
    currentMission = "Understand Visitor";
    alternativeMission = "Build Trust";
  }

  const confidence = Math.round(
    Math.max(20, Math.min(100, lead.score * 0.6 + (interest ? 20 : 0) + (known.length * 4)))
  );

  return {
    currentMission,
    reason: reasonParts.join(" "),
    confidence,
    alternativeMission,
  };
}
