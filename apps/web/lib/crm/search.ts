import { getEnrichedLeads } from "./leads";
import { getEnrichedConversations } from "./conversations";
import type { EnrichedLead, EnrichedConversation, SearchResult } from "./types";

function leadMatches(lead: EnrichedLead, q: string): boolean {
  const i = lead.intelligence;
  const haystack = [
    lead.name,
    lead.email,
    lead.phone,
    i.business?.company,
    i.business?.industry,
    i.business?.businessType,
    i.conversation?.summary,
    i.conversation?.visitorSummary,
    i.conversation?.businessSummary,
    ...(i.conversation?.painPoints ?? []),
    ...(i.conversation?.goals ?? []),
    ...(i.conversation?.interests ?? []),
    ...(i.conversation?.productsDiscussed ?? []),
    ...(i.timeline ?? []).map((t) => `${t.event} ${t.description}`)
  ]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());
  return haystack.some((s) => s.includes(q));
}

function conversationMatches(conv: EnrichedConversation, q: string): boolean {
  const i = conv.intelligence;
  const haystack = [
    conv.lead?.name,
    conv.lead?.email,
    i.business?.company,
    i.conversation?.summary,
    i.conversation?.visitorSummary,
    i.conversation?.businessSummary,
    ...(i.conversation?.painPoints ?? []),
    ...(i.conversation?.goals ?? []),
    ...(i.conversation?.productsDiscussed ?? []),
    ...(conv.messages ?? []).map((m) => m.content),
    ...(i.timeline ?? []).map((t) => `${t.event} ${t.description}`)
  ]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());
  return haystack.some((s) => s.includes(q));
}

export async function searchCRM(opts: {
  workspaceId: string;
  projectId?: string;
  query: string;
}): Promise<SearchResult> {
  const q = opts.query.trim().toLowerCase();
  if (!q) return { leads: [], conversations: [] };

  const [leadsRes, convRes] = await Promise.all([
    getEnrichedLeads({ workspaceId: opts.workspaceId, projectId: opts.projectId, limit: 500 }),
    getEnrichedConversations({ workspaceId: opts.workspaceId, projectId: opts.projectId, limit: 500 })
  ]);

  return {
    leads: leadsRes.leads.filter((l) => leadMatches(l, q)),
    conversations: convRes.conversations.filter((c) => conversationMatches(c, q))
  };
}
