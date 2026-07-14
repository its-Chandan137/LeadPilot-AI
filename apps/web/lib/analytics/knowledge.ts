import type { PersistedConversation } from "@/lib/intelligence-store";
import type { KnowledgeMetrics } from "./types";
import { topN } from "./util";

function bump(map: Map<string, number>, key: string) {
  const k = key?.trim();
  if (!k) return;
  map.set(k, (map.get(k) ?? 0) + 1);
}

export function calculateKnowledgeMetrics(records: PersistedConversation[]): KnowledgeMetrics {
  const topics = new Map<string, number>();
  const pains = new Map<string, number>();
  const objections = new Map<string, number>();
  const positives = new Map<string, number>();
  const gaps = new Map<string, number>();

  for (const r of records) {
    const c = r.conversation;
    if (!c) continue;
    for (const t of [...c.interests, ...c.productsDiscussed, ...c.goals]) bump(topics, t);
    for (const p of c.painPoints) bump(pains, p);
    for (const o of c.objections) {
      bump(objections, o);
      bump(gaps, o);
    }
    for (const p of c.positiveSignals) bump(positives, p);
    for (const n of c.negativeSignals) bump(gaps, n);
  }

  return {
    topTopics: topN([...topics.entries()], 10),
    topPainPoints: topN([...pains.entries()], 8),
    topObjections: topN([...objections.entries()], 8),
    positiveSignals: topN([...positives.entries()], 8),
    knowledgeGaps: topN([...gaps.entries()], 8),
    // Per-question retrieval quality is not persisted; surfaced as empty.
    unmetQuestions: []
  };
}
