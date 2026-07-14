import type { BotObjective } from "@leadpilot/types";
import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
  LeadQualification,
} from "@/lib/ai-response";

export type GoalType =
  | "Greeting"
  | "Build Trust"
  | "Understand Visitor"
  | "Discover Needs"
  | "Understand Pain Points"
  | "Recommend Solution"
  | "Educate"
  | "Answer Questions"
  | "Handle Objections"
  | "Collect Missing Information"
  | "Offer Pricing"
  | "Offer Demo"
  | "Offer Booking"
  | "Offer Contact"
  | "Close Conversation"
  | "Follow Up Later"
  | "Wait";

export interface GoalEngineOutput {
  goal: GoalType;
  reason: string;
  confidence: number;
}

export interface GoalEngineInput {
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  leadScore: number;
  qualification: LeadQualification;
  state?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  configuredObjectives?: BotObjective[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Pure ranking of candidate goals best-first. Never uses message count.
export function rankGoals(input: GoalEngineInput): { goal: GoalType; score: number; reason: string }[] {
  const intent = input.analysis?.intent ?? "";
  const stage = input.state ?? input.analysis?.visitorStage ?? "";
  const sentiment = input.analysis?.sentiment ?? "neutral";
  const pending = input.configuredObjectives?.filter((o) => o.enabled).length ?? 0;
  const sharedContact = Boolean(input.memory.email || input.memory.phone);

  const candidates: { goal: GoalType; score: number; reason: string }[] = [];

  if (sentiment === "negative") {
    candidates.push({ goal: "Handle Objections", score: 92, reason: "Negative sentiment; address concerns first." });
  }
  if (intent === "booking") {
    candidates.push({ goal: "Offer Booking", score: 88, reason: "Visitor is asking about booking." });
  }
  if (intent === "pricing") {
    candidates.push({ goal: "Offer Pricing", score: 84, reason: "Pricing discussion is the active need." });
  }
  if (input.recommendation?.action === "offer_demo" || ((intent === "sales" || intent === "product_information") && input.qualification !== "Cold")) {
    candidates.push({ goal: "Offer Demo", score: 80, reason: "Qualified product interest; a demo fits." });
  }
  if (input.recommendation?.action === "offer_contact" || input.qualification === "Hot") {
    candidates.push({ goal: "Offer Contact", score: 76, reason: "Hot lead; move toward direct contact." });
  }
  if (pending > 0 && (stage === "greeting" || stage === "researching") && !sharedContact) {
    candidates.push({ goal: "Understand Visitor", score: 66, reason: "Early stage with gaps; learn who they are." });
  }
  if (pending > 0 && (intent === "general" || stage === "researching")) {
    candidates.push({ goal: "Discover Needs", score: 62, reason: "Discover what the visitor needs." });
  }
  if ((input.memory.painPoints?.length ?? 0) === 0 && pending > 0) {
    candidates.push({ goal: "Understand Pain Points", score: 58, reason: "No pain points captured yet." });
  }
  if (intent === "product_information" || intent === "support") {
    candidates.push({ goal: "Answer Questions", score: 56, reason: "Visitor is asking product/support questions." });
  }
  if (intent === "product_information" && input.qualification !== "Cold") {
    candidates.push({ goal: "Recommend Solution", score: 54, reason: "Recommend the right solution." });
  }
  if (pending > 0 && sharedContact) {
    candidates.push({ goal: "Collect Missing Information", score: 50, reason: "Some objectives still outstanding." });
  }
  if (stage === "greeting" || stage === "browsing" || intent === "general") {
    candidates.push({ goal: "Build Trust", score: 46, reason: "Build rapport before anything else." });
  }
  if (intent === "general" && !sharedContact && (stage === "greeting" || stage === "browsing")) {
    candidates.push({ goal: "Wait", score: 42, reason: "Visitor is browsing; no goal yet." });
  }
  if (stage === "greeting" || (!input.memory.name && pending === 0)) {
    candidates.push({ goal: "Greeting", score: 40, reason: "Open the conversation naturally." });
  }

  candidates.push({ goal: "Educate", score: 30, reason: "Educate the visitor." });

  return candidates.sort((a, b) => b.score - a.score);
}

/** Decides the single current goal of the conversation. */
export function decideGoal(input: GoalEngineInput): GoalEngineOutput {
  const ranked = rankGoals(input);
  const top = ranked[0];
  return {
    goal: top.goal,
    reason: top.reason,
    confidence: clamp(Math.round(top.score), 20, 100),
  };
}
