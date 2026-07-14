import type { BotObjective, ObjectiveType } from "@leadpilot/types";
import type { ConversationMemory } from "@/lib/conversation-memory";
import type {
  ConversationAnalysis,
  ConversationRecommendation,
  LeadQualification,
} from "@/lib/ai-response";
import { objectiveMemoryField } from "@/lib/objectives";

export type { LeadQualification };

export interface LeadEvaluation {
  /** 0-100 composite lead score. */
  score: number;
  qualification: LeadQualification;
  /** Human-readable explanations of what moved the score (backend only). */
  scoreReasons: string[];
  /** Objective texts the conversation has satisfied. */
  completedObjectives: string[];
  /** Objective texts still outstanding. */
  pendingObjectives: string[];
}

// Flexible, configurable scoring weights. Each entry pairs a delta with a
// human-readable reason fragment so the engine can explain itself.
const SCORE_SIGNALS: {
  test: (ctx: ScoreContext) => boolean;
  delta: number;
  reason: string;
}[] = [
  { test: (c) => !!c.memory.company || !!c.memory.businessType, delta: 15, reason: "Shared business/company information" },
  { test: (c) => c.analysis?.intent === "pricing", delta: 10, reason: "Asked about pricing" },
  {
    test: (c) =>
      c.recommendation?.action === "offer_demo" ||
      c.recommendation?.action === "suggest_implementation",
    delta: 10,
    reason: "Discussed implementation",
  },
  { test: (c) => !!c.memory.painPoints?.length, delta: 15, reason: "Shared a business problem" },
  { test: (c) => !!c.memory.goals?.length, delta: 15, reason: "Discussed current workflow / goals" },
  { test: (c) => !!c.memory.email, delta: 20, reason: "Shared email" },
  { test: (c) => !!c.memory.phone, delta: 15, reason: "Shared phone" },
  { test: (c) => !!c.memory.company, delta: 10, reason: "Shared company" },
  { test: (c) => c.recommendation?.action === "offer_demo", delta: 20, reason: "Requested a demo" },
  { test: (c) => c.recommendation?.action === "offer_contact", delta: 20, reason: "Requested a callback / contact" },
  {
    test: (c) =>
      c.analysis?.intent === "sales" || c.analysis?.intent === "product_information",
    delta: 5,
    reason: "Asked about the business / product",
  },
  {
    test: (c) => c.analysis?.intent === "general" && !hasAnyMemory(c.memory),
    delta: -20,
    reason: "Just browsing, no real engagement",
  },
  { test: (c) => c.analysis?.sentiment === "negative" && c.analysis?.intent === "general", delta: -30, reason: "Unrelated questions" },
  { test: (c) => c.analysis?.sentiment === "negative" && (c.memory.name === undefined), delta: -40, reason: "Possible spam / no rapport" },
];

interface ScoreContext {
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
}

function hasAnyMemory(memory: ConversationMemory): boolean {
  return Boolean(
    memory.name ||
      memory.email ||
      memory.phone ||
      memory.company ||
      memory.businessType ||
      memory.industry ||
      memory.goals?.length ||
      memory.painPoints?.length ||
      memory.productsInterested?.length
  );
}

/**
 * Maps a configured objective to completion using durable memory.
 * Memory-backed types (name/email/phone/company/budget/timeline) are marked
 * completed once the corresponding fact is known. Other types are not
 * auto-derivable from memory and remain pending.
 */
function evaluateObjectiveStatus(
  objectives: BotObjective[],
  memory: ConversationMemory
): { completed: string[]; pending: string[] } {
  const completed: string[] = [];
  const pending: string[] = [];

  for (const o of objectives) {
    if (!o.enabled) {
      pending.push(o.objective);
      continue;
    }
    const field = objectiveMemoryField(o.type as ObjectiveType);
    const done = field ? Boolean((memory as Record<string, unknown>)[field]) : false;
    if (done) completed.push(o.objective);
    else pending.push(o.objective);
  }

  return { completed, pending };
}

export function qualify(score: number): LeadQualification {
  if (score <= 34) return "Cold";
  if (score <= 69) return "Warm";
  return "Hot";
}

/**
 * Continuously evaluates a conversation and produces a lead score, qualification,
 * reasoning, and objective status. Pure function — uses only the signals already
 * produced by memory, analysis, recommendation, and the configured objectives.
 */
export function evaluateLead(ctx: {
  objectives: BotObjective[];
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
}): LeadEvaluation {
  const scoreCtx: ScoreContext = {
    memory: ctx.memory,
    analysis: ctx.analysis,
    recommendation: ctx.recommendation,
  };

  let score = 0;
  const reasons: string[] = [];

  for (const signal of SCORE_SIGNALS) {
    if (signal.test(scoreCtx)) {
      score += signal.delta;
      reasons.push(`${signal.reason} (${signal.delta >= 0 ? "+" : ""}${signal.delta})`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  const { completed, pending } = evaluateObjectiveStatus(ctx.objectives, ctx.memory);

  return {
    score,
    qualification: qualify(score),
    scoreReasons: reasons,
    completedObjectives: completed,
    pendingObjectives: pending,
  };
}
