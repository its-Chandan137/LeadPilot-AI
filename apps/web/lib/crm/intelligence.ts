import {
  loadLeadProfile,
  loadBusinessProfile,
  loadConversationIntelligence,
  loadTimeline,
  loadAnalyticsSnapshot
} from "@/lib/intelligence-store";
import type { PersistedIntelligence } from "./types";

/**
 * Joins every persisted-intelligence record for a single conversation.
 * Reads only from the persistence layer — no AI, no recomputation.
 */
export async function getPersistedIntelligence(conversationId?: string | null): Promise<PersistedIntelligence> {
  if (!conversationId) {
    return { lead: null, business: null, conversation: null, analytics: null, timeline: [] };
  }
  const [lead, business, conversation, analytics, timeline] = await Promise.all([
    loadLeadProfile(conversationId),
    loadBusinessProfile(conversationId),
    loadConversationIntelligence(conversationId),
    loadAnalyticsSnapshot(conversationId),
    loadTimeline(conversationId)
  ]);
  return { lead, business, conversation, analytics, timeline };
}
