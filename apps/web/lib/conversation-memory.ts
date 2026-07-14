/**
 * Conversation Memory Manager
 *
 * Each conversation owns a single evolving memory profile. The AI returns
 * `memoryUpdates` in its structured response; this module loads the existing
 * memory, merges the updates, persists it, and produces a concise summary that
 * is injected into the system prompt so the model never loses durable facts.
 *
 * Storage note: this phase is backend architecture only and must not change the
 * database schema, so memory lives in an in-memory map keyed by conversationId.
 * (A future phase can back this with a database table without touching callers.)
 */

export interface ConversationMemory {
  name?: string;
  email?: string;
  phone?: string;

  company?: string;
  industry?: string;
  location?: string;

  businessType?: string;

  goals?: string[];
  painPoints?: string[];

  timeline?: string;
  budget?: string;

  productsInterested?: string[];

  notes?: string[];

  // Allow additional durable facts without breaking consumers.
  [key: string]: string | string[] | undefined;
}

// Facts that are reasoning, not durable memory. Never persisted into memory.
const TRANSIENT_KEYS = new Set([
  "intent",
  "confidence",
  "visitorStage",
  "sentiment",
  "recommendation",
  "analysis"
]);

const memoryStore = new Map<string, ConversationMemory>();

function emptyMemory(): ConversationMemory {
  return {};
}

// Case-insensitive membership check for avoiding duplicate array entries.
function includesCI(arr: string[], value: string): boolean {
  const lower = value.toLowerCase();
  return arr.some((item) => item.toLowerCase() === lower);
}

/**
 * Loads the memory profile for a conversation, or an empty one if none exists.
 */
export function getConversationMemory(conversationId: string): ConversationMemory {
  return memoryStore.get(conversationId) ?? emptyMemory();
}

/**
 * Merges new `memoryUpdates` into the conversation's memory and persists it.
 *
 * Rules:
 * - Transient reasoning keys (intent, confidence, etc.) are ignored.
 * - Empty/null values never overwrite existing values.
 * - Latest confirmed fact wins for simple fields.
 * - Array fields are merged without duplicates.
 */
export function mergeMemoryUpdates(
  conversationId: string,
  updates: Record<string, unknown> | undefined
): ConversationMemory {
  if (!updates || typeof updates !== "object") {
    return getConversationMemory(conversationId);
  }

  const memory = { ...getConversationMemory(conversationId) };

  for (const [key, value] of Object.entries(updates)) {
    if (TRANSIENT_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;

    const current = memory[key];

    if (Array.isArray(current)) {
      // Merge into existing array, avoiding duplicates.
      const merged = [...current];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string" && !includesCI(merged, item)) {
            merged.push(item);
          }
        }
      } else if (typeof value === "string" && !includesCI(merged, value)) {
        merged.push(value);
      }
      memory[key] = merged;
    } else if (Array.isArray(value)) {
      // New array value -> store unique string entries only.
      memory[key] = value.filter(
        (item): item is string => typeof item === "string"
      );
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      // Simple field -> latest confirmed fact wins.
      memory[key] = String(value);
    }
  }

  memoryStore.set(conversationId, memory);
  return memory;
}

/**
 * Builds the concise "KNOWN VISITOR INFORMATION" block injected into the
 * system prompt. Returns an empty string when memory is empty.
 */
export function buildMemorySummary(memory: ConversationMemory): string {
  const lines: string[] = [];

  const pushSimple = (label: string, value?: string) => {
    if (value) lines.push(`${label}:\n${value}`);
  };
  const pushList = (label: string, value?: string[]) => {
    if (value && value.length > 0) lines.push(`${label}:\n${value.join("\n")}`);
  };

  pushSimple("Name", memory.name);
  pushSimple("Company", memory.company);
  pushSimple("Location", memory.location);
  pushSimple("Business", memory.businessType ?? memory.industry);
  pushList("Goals", memory.goals);
  pushList("Pain Points", memory.painPoints);
  pushList("Products Interested", memory.productsInterested);
  pushSimple("Email", memory.email);
  pushSimple("Phone", memory.phone);
  pushSimple("Timeline", memory.timeline);
  pushSimple("Budget", memory.budget);

  // Any extra durable facts.
  for (const [key, value] of Object.entries(memory)) {
    if (
      [
        "name",
        "company",
        "location",
        "businessType",
        "industry",
        "goals",
        "painPoints",
        "productsInterested",
        "email",
        "phone",
        "timeline",
        "budget"
      ].includes(key)
    ) {
      continue;
    }
    if (typeof value === "string") pushSimple(key, value);
    else if (Array.isArray(value)) pushList(key, value);
  }

  if (lines.length === 0) return "";

  return `\n\nKNOWN VISITOR INFORMATION (use naturally, never ask again for known info, only verify if the visitor explicitly corrects it):\n${lines.join("\n\n")}`;
}
