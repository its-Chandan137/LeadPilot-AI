import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
  LeadQualification,
} from "@/lib/ai-response";

export interface ConversationIntelligence {
  summary: string;
  visitorSummary: string;
  businessSummary: string;
  painPoints: string[];
  goals: string[];
  interests: string[];
  productsDiscussed: string[];
  objections: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  nextRecommendedStep: string;
  conversationQuality: string;
  engagementScore: number;
}

export interface ConversationIntelligenceInput {
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  leadScore: number;
  qualification: LeadQualification;
  completedObjectives?: string[];
  pendingObjectives?: string[];
  history?: { role: "user" | "assistant"; content: string }[];
}

function unique(arr?: string[]): string[] {
  return Array.from(new Set((arr ?? []).map((s) => s.trim()).filter(Boolean)));
}

function joinList(arr: string[]): string {
  return arr.length ? arr.join(", ") : "—";
}

// Heuristic engagement score (0-100): conversation quality, NOT buying intent.
function computeEngagementScore(input: ConversationIntelligenceInput): number {
  const history = input.history ?? [];
  const userMsgs = history.filter((m) => m.role === "user");
  const userCount = userMsgs.length;
  const questions = userMsgs.reduce(
    (n, m) => n + (m.content.match(/\?/g)?.length ?? 0),
    0
  );

  const memory = input.memory;
  const memoryFields = [
    memory.name,
    memory.email,
    memory.phone,
    memory.company,
    memory.industry,
    memory.businessType,
    memory.location,
    memory.budget,
    memory.timeline,
  ].filter(Boolean).length;

  const intent = input.analysis?.intent ?? "";
  const interest =
    intent === "pricing" || intent === "sales" || intent === "product_information"
      ? 12
      : intent === "general"
        ? 0
        : 6;

  const sentimentPenalty = input.analysis?.sentiment === "negative" ? 15 : 0;

  const score =
    Math.min(userCount, 10) * 4 +
    Math.min(questions, 5) * 3 +
    Math.min(memoryFields, 8) * 4 +
    interest -
    sentimentPenalty;

  return Math.max(0, Math.min(100, score));
}

function qualityLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

function buildVisitorSummary(memory: ConversationMemory): string {
  const lines: string[] = [];
  const push = (label: string, value?: string) => {
    if (value) lines.push(`${label}: ${value}`);
  };
  push("Name", memory.name);
  push("Company", memory.company);
  push("Location", memory.location);
  push("Industry", memory.industry);
  push("Business", memory.businessType);
  if (memory.name) lines.push("Decision Maker: Likely");
  push("Timeline", memory.timeline);
  push("Budget", memory.budget);
  push("Products Interested", joinList(memory.productsInterested ?? []));
  return lines.length ? lines.join("\n") : "—";
}

function buildBusinessSummary(memory: ConversationMemory): string {
  const lines: string[] = [];
  lines.push(`Business Type: ${memory.businessType ?? memory.industry ?? "—"}`);
  lines.push(`Current Challenges: ${joinList(memory.painPoints ?? [])}`);
  lines.push(`Desired Outcome: ${joinList(memory.goals ?? [])}`);
  lines.push(`Primary Use Case: ${joinList(memory.productsInterested ?? [])}`);
  return lines.join("\n");
}

function buildSummary(input: ConversationIntelligenceInput): string {
  const { memory, analysis, qualification } = input;
  const name = memory.name ? `${memory.name} ` : "";
  const company = memory.company ? `of ${memory.company}` : "";
  const location = memory.location ? ` in ${memory.location}` : "";
  const pains = (memory.painPoints ?? []).length
    ? ` Looking to address: ${joinList(memory.painPoints ?? [])}.`
    : "";
  const intent = analysis?.intent ? ` Interested in ${analysis.intent}.` : "";
  return `${name}${company}${location}.${pains}${intent} ${qualification} lead.`;
}

function buildNextStep(input: ConversationIntelligenceInput): string {
  const intent = input.analysis?.intent ?? "";
  const sentiment = input.analysis?.sentiment ?? "neutral";

  if (sentiment === "negative") return "Human callback";
  if (intent === "pricing") return "Send pricing";
  if (intent === "booking") return "Book appointment";
  if (intent === "sales" || intent === "product_information") return "Schedule demo";
  if (input.qualification === "Hot") return "Sales follow-up";
  if (input.qualification === "Warm") return "Continue nurturing";
  return "No action needed";
}

function buildSignals(input: ConversationIntelligenceInput): {
  positive: string[];
  negative: string[];
  objections: string[];
} {
  const { memory, analysis, recommendation, qualification } = input;
  const positive: string[] = [];
  const negative: string[] = [];

  if (memory.name) positive.push("Shared their name");
  if (memory.email) positive.push("Shared email");
  if (memory.phone) positive.push("Shared phone");
  if (memory.company) positive.push("Shared company");
  if ((memory.painPoints ?? []).length) positive.push("Described a pain point");
  if (analysis?.intent === "pricing") positive.push("Asked about pricing");
  if (recommendation?.action === "offer_demo") positive.push("Requested a demo");
  if (qualification === "Hot") positive.push("Hot lead");

  if (analysis?.sentiment === "negative") {
    negative.push("Negative sentiment");
    negative.push("Possible friction or objection");
  }
  if (analysis?.intent === "general" && !memory.name) {
    negative.push("Only browsing, no engagement yet");
  }

  const objections =
    analysis?.sentiment === "negative"
      ? ["Visitor expressed hesitation or concerns"]
      : [];

  return { positive, negative, objections };
}

/**
 * Generates structured conversation intelligence from memory, analysis,
 * recommendation, and history. Pure function — safe to call per request.
 */
export function buildConversationIntelligence(
  input: ConversationIntelligenceInput
): ConversationIntelligence {
  const engagementScore = computeEngagementScore(input);
  const { positive, negative, objections } = buildSignals(input);

  return {
    summary: buildSummary(input),
    visitorSummary: buildVisitorSummary(input.memory),
    businessSummary: buildBusinessSummary(input.memory),
    painPoints: unique(input.memory.painPoints),
    goals: unique(input.memory.goals),
    interests: unique(input.memory.productsInterested),
    productsDiscussed: unique(input.memory.productsInterested),
    objections,
    positiveSignals: positive,
    negativeSignals: negative,
    nextRecommendedStep: buildNextStep(input),
    conversationQuality: qualityLabel(engagementScore),
    engagementScore,
  };
}
