import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
} from "@/lib/ai-response";
import type { LeadEvaluation } from "@/lib/lead-scoring";
import type { GoalEngineOutput } from "@/lib/goal-engine";
import type { ActionEngineOutput } from "@/lib/action-engine";

export type TimelineCategory =
  | "journey"
  | "information"
  | "intent"
  | "qualification"
  | "action";

export interface ConversationEvent {
  timestamp: string;
  event: string;
  description: string;
  category: TimelineCategory;
  importance: number;
}

export interface TimelineEngineInput {
  conversationId: string;
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  lead: LeadEvaluation;
  goal?: GoalEngineOutput;
  nextAction?: ActionEngineOutput;
}

function ev(
  event: string,
  description: string,
  category: TimelineCategory,
  importance: number
): ConversationEvent {
  return {
    timestamp: new Date().toISOString(),
    event,
    description,
    category,
    importance,
  };
}

/**
 * Builds structured conversation events from the current signals. Recomputed
 * per turn (no diffing yet). Not persisted.
 */
export function buildTimelineEvents(input: TimelineEngineInput): ConversationEvent[] {
  const { memory, analysis, recommendation, lead } = input;
  const events: ConversationEvent[] = [];

  events.push(ev("Visitor Started Conversation", "Conversation is active.", "journey", 1));

  if (memory.name) events.push(ev("Shared Name", `Name: ${memory.name}`, "information", 2));
  if (memory.email) events.push(ev("Shared Email", "Visitor shared email.", "information", 3));
  if (memory.phone) events.push(ev("Shared Phone", "Visitor shared phone.", "information", 3));
  if (memory.company) events.push(ev("Shared Company", `Company: ${memory.company}`, "information", 2));
  if (memory.budget) events.push(ev("Mentioned Budget", `Budget: ${memory.budget}`, "information", 2));
  if (memory.timeline) events.push(ev("Mentioned Timeline", `Timeline: ${memory.timeline}`, "information", 2));

  const intent = analysis?.intent ?? "";
  if (intent === "pricing") events.push(ev("Asked Pricing", "Discussed pricing.", "intent", 2));
  if (intent === "product_information" || intent === "sales")
    events.push(ev("Asked About Features", "Explored product features.", "intent", 2));
  if (intent === "booking") events.push(ev("Asked Booking", "Discussed booking.", "intent", 3));
  if (recommendation?.action === "offer_demo")
    events.push(ev("Requested Demo", "Demo was offered/requested.", "action", 3));
  if (recommendation?.action === "offer_contact")
    events.push(ev("Requested Contact", "Contact was offered/requested.", "action", 3));

  if (lead.qualification === "Warm")
    events.push(ev("Qualified Warm", `Lead score ${lead.score}.`, "qualification", 2));
  if (lead.qualification === "Hot")
    events.push(ev("Qualified Hot", `Lead score ${lead.score}.`, "qualification", 3));

  return events;
}
