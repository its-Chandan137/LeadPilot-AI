import type { BotObjective } from "@leadpilot/types";
import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
  LeadQualification,
} from "@/lib/ai-response";

export type ActionType =
  | "continue_helping"
  | "ask_objective"
  | "clarify_need"
  | "recommend_feature"
  | "recommend_service"
  | "offer_demo"
  | "offer_contact"
  | "offer_quote"
  | "offer_booking"
  | "offer_handoff"
  | "wait";

export interface ActionEngineOutput {
  action: ActionType;
  reason: string;
  confidence: number;
}

export interface ActionEngineInput {
  conversationId: string;
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  leadScore: number;
  qualification: LeadQualification;
  objectives?: BotObjective[];
  completedObjectives?: string[];
  pendingObjectives?: string[];
  history?: { role: "user" | "assistant"; content: string }[];
}

// Actions that, once offered, should not be repeated unless the conversation
// has clearly moved on.
const REPEATABLE_OFFERS: ActionType[] = [
  "offer_demo",
  "offer_contact",
  "offer_booking",
  "offer_quote",
];

// Recent action history per conversation (backend only, in-memory).
const recentActions = new Map<string, ActionType[]>();

export function getRecentActions(conversationId: string): ActionType[] {
  return recentActions.get(conversationId) ?? [];
}

function recordAction(conversationId: string, action: ActionType) {
  const list = recentActions.get(conversationId) ?? [];
  list.push(action);
  // Keep only the most recent few turns for repetition checks.
  recentActions.set(conversationId, list.slice(-5));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ---- Signals -------------------------------------------------------------

function trustLevel(input: ActionEngineInput): number {
  const { memory, qualification } = input;
  let trust = qualification === "Hot" ? 0.8 : qualification === "Warm" ? 0.5 : 0.2;
  if (memory.email || memory.phone) trust += 0.2;
  if (memory.name) trust += 0.1;
  if (memory.company || memory.businessType) trust += 0.1;
  return clamp(trust, 0, 1);
}

function isAppointmentBusiness(memory: ConversationMemory): boolean {
  const blob = [memory.businessType, memory.industry, memory.company]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(dental|dentist|clinic|health|medical|hospital|physio|care|restaurant|salon|spa|appointment)/.test(
    blob
  );
}

interface Candidate {
  action: ActionType;
  score: number;
  reason: string;
}

// Pure ranking — independently testable. Returns candidates best-first.
export function rankActions(input: ActionEngineInput): Candidate[] {
  const intent = input.analysis?.intent ?? "";
  const stage = input.analysis?.visitorStage ?? "";
  const sentiment = input.analysis?.sentiment ?? "neutral";
  const trust = trustLevel(input);
  const recAction = input.recommendation?.action ?? "";
  const pending = input.pendingObjectives ?? [];
  const hasPending = pending.length > 0;
  const sharedContact = Boolean(input.memory.email || input.memory.phone);

  const candidates: Candidate[] = [];

  // Frustrated / off-topic visitor -> hand off to a human.
  if (sentiment === "negative" && (!sharedContact || intent === "general")) {
    candidates.push({
      action: "offer_handoff",
      score: 92,
      reason: "Visitor seems frustrated or off-topic; route to a human.",
    });
  }

  // Appointment-focused business that looks ready -> booking.
  if (isAppointmentBusiness(input.memory) && (intent === "booking" || stage === "decision" || stage === "evaluation") && trust > 0.4) {
    candidates.push({
      action: "offer_booking",
      score: 84,
      reason: "Appointment-focused business and visitor is ready to book.",
    });
  }

  // Pricing discussion with real interest -> quote.
  if (intent === "pricing" && (input.qualification !== "Cold" || trust > 0.3)) {
    candidates.push({
      action: "offer_quote",
      score: 80,
      reason: "Pricing discussion with qualified interest; offer a quote.",
    });
  }

  // Explicit demo request, or qualified product interest -> demo.
  if (recAction === "offer_demo" || (intent === "sales" || intent === "product_information") && input.qualification !== "Cold" && trust > 0.4) {
    candidates.push({
      action: "offer_demo",
      score: 76,
      reason: "Visitor shows qualified product interest; offer a demo.",
    });
  }

  // Hot lead with trust -> contact.
  if (recAction === "offer_contact" || (input.qualification === "Hot" && trust > 0.4)) {
    candidates.push({
      action: "offer_contact",
      score: 72,
      reason: "Hot, trusted lead; offer direct contact.",
    });
  }

  if ((intent === "service" || intent === "product_information") && hasPending) {
    candidates.push({
      action: "recommend_service",
      score: 62,
      reason: "Visitor exploring services; recommend the right one.",
    });
  }

  if (intent === "product_information" && trust > 0.3) {
    candidates.push({
      action: "recommend_feature",
      score: 56,
      reason: "Product interest; highlight a relevant feature.",
    });
  }

  if (hasPending && trust > 0.3 && trust < 0.7 && intent !== "general") {
    candidates.push({
      action: "ask_objective",
      score: 50,
      reason: "A natural moment to learn an outstanding objective.",
    });
  }

  if ((stage === "greeting" || stage === "researching") && hasPending && trust < 0.4) {
    candidates.push({
      action: "clarify_need",
      score: 46,
      reason: "Early stage with gaps; clarify the visitor's need.",
    });
  }

  if (intent === "general" && !sharedContact && (stage === "greeting" || stage === "browsing")) {
    candidates.push({
      action: "wait",
      score: 42,
      reason: "Visitor is browsing; no action improves the conversation yet.",
    });
  }

  // Default baseline.
  candidates.push({
    action: "continue_helping",
    score: 30,
    reason: "Keep helping the visitor naturally.",
  });

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Decides the single best next action, guarding against repeating offers that
 * were already made unless the conversation has clearly progressed.
 */
export function decideAction(input: ActionEngineInput): ActionEngineOutput {
  const ranked = rankActions(input);
  const recent = getRecentActions(input.conversationId);

  for (const candidate of ranked) {
    const isRepeatOffer =
      REPEATABLE_OFFERS.includes(candidate.action) && recent.includes(candidate.action);
    if (isRepeatOffer) continue; // pick the next best instead
    recordAction(input.conversationId, candidate.action);
    return {
      action: candidate.action,
      reason: candidate.reason,
      confidence: clamp(Math.round(candidate.score), 20, 100),
    };
  }

  // All candidates excluded (unlikely) -> safe default.
  recordAction(input.conversationId, "continue_helping");
  return {
    action: "continue_helping",
    reason: "No stronger action; keep helping the visitor.",
    confidence: 30,
  };
}
