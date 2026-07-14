import { z } from "zod";

/**
 * Reusable structured-response contracts.
 *
 * These types describe the JSON the model returns. They are intentionally
 * decoupled from any storage or lead-scoring logic so future phases
 * (lead scoring, CRM sync, analytics, voice memory) can consume them
 * without redefining the shape.
 */

// Only newly learned facts. Never the full conversation. Values may be
// strings, numbers, booleans, null, or string arrays (for list-like fields
// such as goals or pain points). Unknown keys are allowed so the schema can
// grow without breaking the parser.
export type MemoryUpdates = Record<
  string,
  string | number | boolean | null | string[]
>;

export type ConversationIntent =
  | "pricing"
  | "booking"
  | "support"
  | "appointment"
  | "product_information"
  | "sales"
  | "general";

export type VisitorStage =
  | "greeting"
  | "researching"
  | "evaluating"
  | "considering_purchase"
  | "qualified"
  | "existing_customer";

export interface ConversationAnalysis {
  // Lightweight intent classification (NOT lead scoring).
  intent: ConversationIntent | string;
  // Model confidence 0-100.
  confidence: number;
  visitorStage: VisitorStage | string;
  sentiment: string;
  // Allow future analytical fields without breaking consumers.
  [key: string]: unknown;
}

export type RecommendationAction =
  | "continue_conversation"
  | "ask_for_missing_information"
  | "offer_demo"
  | "offer_contact"
  | "end_conversation";

export interface ConversationRecommendation {
  // Internal recommendation only. The backend does not act on it yet.
  action: RecommendationAction | string;
  [key: string]: unknown;
}

export interface AIConversationResponse {
  // The ONLY text shown to the visitor.
  reply: string;
  memoryUpdates?: MemoryUpdates;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
}

// ---------------------------------------------------------------------------
// Zod schemas — isolate validation so parsing logic is never duplicated.
// ---------------------------------------------------------------------------

const memoryUpdatesSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

const analysisSchema = z
  .object({
    intent: z.string(),
    confidence: z.number().min(0).max(100),
    visitorStage: z.string(),
    sentiment: z.string()
  })
  .passthrough();

const recommendationSchema = z
  .object({
    action: z.string()
  })
  .passthrough();

const aiResponseSchema = z.object({
  reply: z.string(),
  memoryUpdates: memoryUpdatesSchema.optional(),
  analysis: analysisSchema.optional(),
  recommendation: recommendationSchema.optional()
});

// ---------------------------------------------------------------------------
// Prompt fragment — tells the model to emit the structured response.
// ---------------------------------------------------------------------------

export function buildStructuredResponseInstruction(): string {
  return `
RESPONSE FORMAT — you MUST reply with a single valid JSON object and nothing else.
No markdown, no code fences, no explanations outside the JSON. Only JSON.

Use exactly this shape:
{
  "reply": "The visible message shown to the visitor. This is the ONLY text the visitor sees.",
  "memoryUpdates": { },
  "analysis": {
    "intent": "pricing | booking | support | appointment | product_information | sales | general",
    "confidence": 0,
    "visitorStage": "greeting | researching | evaluating | considering_purchase | qualified | existing_customer",
    "sentiment": "positive | neutral | negative"
  },
  "recommendation": {
    "action": "continue_conversation | ask_for_missing_information | offer_demo | offer_contact | end_conversation"
  }
}

Rules:
- "reply" contains ONLY the text displayed to the visitor.
- "memoryUpdates" returns ONLY newly learned facts (e.g. {"name":"John"}). Return {} when nothing new. Never overwrite known values unless the visitor explicitly corrects them. Never invent information.
- "analysis" and "recommendation" are internal only and must never be shown to the visitor.
- Always return valid JSON.`;
}

// ---------------------------------------------------------------------------
// Parsing — safe, isolated, and never throws.
// ---------------------------------------------------------------------------

// Strips accidental markdown/code fences the model may wrap around the JSON.
function stripJsonWrapper(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1].trim() : trimmed;
}

// Build an empty-but-valid fallback so the rest of the pipeline stays stable.
function emptyResponse(reply: string): AIConversationResponse {
  return { reply, memoryUpdates: {} };
}

/**
 * Parses raw model output into a structured response.
 *
 * On ANY failure the raw text is returned as the `reply` and all metadata is
 * left empty, so the visitor never notices a parser problem. This function
 * never throws.
 */
export function parseAIResponse(raw: string): AIConversationResponse {
  const cleaned = stripJsonWrapper(raw);

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null) {
      return emptyResponse(raw);
    }

    const result = aiResponseSchema.safeParse(parsed);
    if (result.success) {
      return {
        reply: result.data.reply,
        memoryUpdates: result.data.memoryUpdates ?? {},
        analysis: result.data.analysis,
        recommendation: result.data.recommendation
      };
    }

    // Valid JSON but schema off — salvage a usable reply if present.
    if (typeof parsed.reply === "string") {
      return emptyResponse(parsed.reply);
    }

    return emptyResponse(raw);
  } catch {
    // Invalid JSON — fall back to the raw text as the reply.
    return emptyResponse(raw);
  }
}
