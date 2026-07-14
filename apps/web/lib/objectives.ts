import type { BotObjective, ObjectiveType } from "@leadpilot/types";

/** Project-level goal that selects which objective catalog applies. */
export type ProjectObjective =
  | "lead-generation"
  | "customer-support"
  | "general-information";

let counter = 0;
function makeId(type: ObjectiveType, seed: string): string {
  // Stable-enough id for a predefined objective within a project.
  counter += 1;
  const base = String(seed || counter).replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `obj_${type}_${base}`;
}

function obj(
  type: ObjectiveType,
  objective: string,
  priority: number
): BotObjective {
  return { id: makeId(type, objective), type, objective, enabled: true, priority };
}

/**
 * Predefined objective catalog. These are GOALS the AI should naturally
 * achieve — never a scripted checklist of questions.
 */
export const PREDEFINED_OBJECTIVES: Record<ProjectObjective, BotObjective[]> = {
  "lead-generation": [
    obj("name", "Learn the visitor's name.", 1),
    obj("email", "Collect the visitor's email address.", 2),
    obj("phone", "Collect the visitor's phone number.", 3),
    obj("company", "Learn the visitor's company.", 4),
    obj("budget", "Understand the visitor's expected budget.", 5),
    obj("timeline", "Understand the visitor's timeline.", 6),
    obj("service", "Understand which service interests the visitor.", 7),
  ],
  "customer-support": [
    obj("service", "Understand which product or service the visitor needs help with.", 1),
    obj("custom", "Understand how long the visitor has had this issue.", 2),
    obj("custom", "Collect the visitor's account or order number.", 3),
    obj("custom", "Learn what troubleshooting the visitor has already tried.", 4),
    obj("custom", "Collect the visitor's preferred contact method.", 5),
  ],
  "general-information": [
    obj("service", "Help the visitor understand the services offered.", 1),
    obj("custom", "Share the business hours when asked.", 2),
    obj("custom", "Share the business location when asked.", 3),
    obj("custom", "Share how to contact the team when asked.", 4),
    obj("budget", "Share the pricing plans when asked.", 5),
    obj("custom", "Clarify whether a free trial is available when asked.", 6),
  ],
};

/** Maps an objective type to the durable memory field that proves completion. */
const OBJECTIVE_MEMORY_FIELD: Partial<Record<ObjectiveType, string>> = {
  name: "name",
  email: "email",
  phone: "phone",
  company: "company",
  budget: "budget",
  timeline: "timeline",
};

export function objectiveMemoryField(type: ObjectiveType): string | undefined {
  return OBJECTIVE_MEMORY_FIELD[type];
}

/**
 * Resolves the configured objectives for a project from its widget config.
 * Prefers the structured `objectives` field; falls back to the legacy
 * `questions` string list, then to the default catalog for the objective.
 */
export function getConfiguredObjectives(widgetConfig: unknown): BotObjective[] {
  const config = (widgetConfig ?? null) as {
    objectives?: unknown;
    questions?: unknown;
    objective?: unknown;
  } | null;

  if (Array.isArray(config?.objectives)) {
    const parsed = (config?.objectives as unknown[])
      .filter(
        (o): o is BotObjective =>
          !!o &&
          typeof o === "object" &&
          typeof (o as BotObjective).objective === "string"
      )
      .map((o, i) => ({
        id: o.id ?? makeId(o.type ?? "custom", o.objective),
        type: (o.type ?? "custom") as ObjectiveType,
        objective: o.objective,
        enabled: o.enabled !== false,
        priority: typeof o.priority === "number" ? o.priority : i + 1,
      }));
    if (parsed.length > 0) return parsed;
  }

  // Legacy string questions -> objectives.
  if (Array.isArray(config?.questions)) {
    return (config?.questions as unknown[])
      .filter((q): q is string => typeof q === "string")
      .map((q, i) => obj(guessType(q), q, i + 1));
  }

  const objective = config?.objective;
  if (objective === "customer-support") return PREDEFINED_OBJECTIVES["customer-support"];
  if (objective === "general-information") return PREDEFINED_OBJECTIVES["general-information"];
  return PREDEFINED_OBJECTIVES["lead-generation"];
}

// Best-effort mapping of a legacy question string to an objective type.
function guessType(text: string): ObjectiveType {
  const t = text.toLowerCase();
  if (t.includes("name")) return "name";
  if (t.includes("email")) return "email";
  if (t.includes("phone")) return "phone";
  if (t.includes("company") || t.includes("business")) return "company";
  if (t.includes("budget") || t.includes("price")) return "budget";
  if (t.includes("timeline") || t.includes("started") || t.includes("when")) return "timeline";
  if (t.includes("service") || t.includes("product") || t.includes("interested")) return "service";
  return "custom";
}
