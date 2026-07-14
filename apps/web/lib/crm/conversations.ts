import { getSharedPrismaClient } from "@/lib/prisma";
import { getPersistedIntelligence } from "./intelligence";
import type { EnrichedConversation, ProjectRef, MessageDetail, LeadLite } from "./types";

export interface ConversationQuery {
  workspaceId: string;
  projectId?: string;
  search?: string;
  dateRange?: "today" | "7days" | "30days" | "all";
  page?: number;
  limit?: number;
}

export interface EnrichedConversationsResult {
  conversations: EnrichedConversation[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

function mapLead(raw: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  createdAt: Date;
}): LeadLite {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    status: raw.status as LeadLite["status"],
    source: raw.source as LeadLite["source"],
    createdAt: raw.createdAt.toISOString()
  };
}

export async function getEnrichedConversations(opts: ConversationQuery): Promise<EnrichedConversationsResult> {
  const prisma = getSharedPrismaClient();
  const where: Record<string, unknown> = {
    project: { workspaceId: opts.workspaceId }
  };
  if (opts.projectId) where.projectId = opts.projectId;
  if (opts.dateRange === "today") where.createdAt = { gte: new Date(new Date().setHours(0, 0, 0, 0)) };
  else if (opts.dateRange === "7days") where.createdAt = { gte: new Date(Date.now() - 7 * 864e5) };
  else if (opts.dateRange === "30days") where.createdAt = { gte: new Date(Date.now() - 30 * 864e5) };

  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 25,
      skip: ((opts.page ?? 1) - 1) * (opts.limit ?? 25),
      select: {
        id: true,
        visitorId: true,
        createdAt: true,
        projectId: true,
        project: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } }
      }
    }),
    prisma.conversation.count({ where })
  ]);

  const ids = rows.map((r) => r.id);
  const leads = ids.length
    ? await prisma.lead.findMany({
        where: { conversationId: { in: ids } },
        select: { id: true, name: true, email: true, phone: true, status: true, source: true, createdAt: true, conversationId: true }
      })
    : [];
  const leadByConv = new Map<string, (typeof leads)[number]>();
  for (const l of leads) {
    if (l.conversationId && !leadByConv.has(l.conversationId)) leadByConv.set(l.conversationId, l);
  }

  const conversations: EnrichedConversation[] = await Promise.all(
    rows.map(async (c) => {
      const raw = leadByConv.get(c.id);
    return {
      id: c.id,
      visitorId: c.visitorId,
      createdAt: c.createdAt.toISOString(),
      projectId: c.projectId,
      project: c.project as ProjectRef,
      lead: raw ? mapLead(raw) : null,
      messages: c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString()
      })),
      intelligence: await getPersistedIntelligence(c.id)
    };
  })
  );

  // Client-side search across intelligence + messages + lead name.
  let filtered = conversations;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    filtered = conversations.filter((c) => {
      if (c.lead?.name?.toLowerCase().includes(q)) return true;
      if (c.intelligence.conversation?.summary?.toLowerCase().includes(q)) return true;
      if (c.intelligence.conversation?.painPoints?.some((p) => p.toLowerCase().includes(q))) return true;
      if (c.intelligence.conversation?.goals?.some((p) => p.toLowerCase().includes(q))) return true;
      if (c.intelligence.business?.company?.toLowerCase().includes(q)) return true;
      if (c.messages.some((m) => m.content.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const start = (page - 1) * limit;

  return {
    conversations: filtered.slice(start, start + limit),
    total: filtered.length,
    totalPages,
    page,
    limit
  };
}

export async function getEnrichedConversation(
  conversationId: string,
  workspaceId: string
): Promise<EnrichedConversation | null> {
  const prisma = getSharedPrismaClient();
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      visitorId: true,
      createdAt: true,
      projectId: true,
      project: { select: { id: true, name: true, workspaceId: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } }
    }
  });
  if (!conversation || conversation.project.workspaceId !== workspaceId) return null;

  const rawLead = await prisma.lead.findFirst({
    where: { conversationId },
    select: { id: true, name: true, email: true, phone: true, status: true, source: true, createdAt: true }
  });

  return {
    id: conversation.id,
    visitorId: conversation.visitorId,
    createdAt: conversation.createdAt.toISOString(),
    projectId: conversation.projectId,
    project: conversation.project,
    lead: rawLead ? mapLead(rawLead) : null,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString()
    })),
    intelligence: await getPersistedIntelligence(conversation.id)
  };
}
