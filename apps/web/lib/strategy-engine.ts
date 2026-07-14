import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
  LeadQualification,
} from "@/lib/ai-response";
import type { GoalType } from "@/lib/goal-engine";
import type { BusinessProfile } from "@/lib/crm-intelligence";

export type StrategyType =
  | "Consultative"
  | "Educational"
  | "Relationship Building"
  | "Technical"
  | "Friendly"
  | "Direct"
  | "Soft Sell"
  | "Urgent"
  | "Problem Solving"
  | "Advisory"
  | "Support";

export interface StrategyEngineOutput {
  strategy: StrategyType;
  reason: string;
}

export interface StrategyEngineInput {
  goal: GoalType;
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  leadScore: number;
  qualification: LeadQualification;
  business?: BusinessProfile;
}

function isCareBusiness(business?: BusinessProfile): boolean {
  const blob = [business?.type, business?.industry, business?.company]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(health|medical|dental|clinic|care|legal|finance|insurance)/.test(blob);
}

// Pure selection of the best communication style for the current goal/context.
export function decideStrategy(input: StrategyEngineInput): StrategyEngineOutput {
  const { goal, analysis, recommendation, qualification, business } = input;
  const intent = analysis?.intent ?? "";
  const sentiment = analysis?.sentiment ?? "neutral";

  if (intent === "support" || goal === "Answer Questions") {
    return { strategy: "Support", reason: "Support context; be helpful and precise." };
  }
  if (sentiment === "negative" || goal === "Handle Objections") {
    return { strategy: "Problem Solving", reason: "Resolve concerns calmly." };
  }
  if (goal === "Offer Booking" || goal === "Offer Demo" || goal === "Offer Contact" || recommendation?.action === "offer_contact") {
    return { strategy: "Direct", reason: "Clear next step is appropriate now." };
  }
  if (intent === "pricing") {
    return { strategy: "Consultative", reason: "Walk through value before the number." };
  }
  if (isCareBusiness(business)) {
    return { strategy: "Relationship Building", reason: "Trust-led business; build the relationship." };
  }
  if (intent === "product_information" || intent === "sales") {
    return { strategy: "Advisory", reason: "Advise on the best fit." };
  }
  if (qualification === "Hot") {
    return { strategy: "Soft Sell", reason: "Warm lead; gentle forward motion." };
  }
  if (goal === "Educate" || goal === "Recommend Solution") {
    return { strategy: "Educational", reason: "Teach, don't pitch." };
  }
  if (goal === "Build Trust" || goal === "Understand Visitor") {
    return { strategy: "Friendly", reason: "Stay warm and approachable early." };
  }

  return { strategy: "Consultative", reason: "Default consultative approach." };
}
