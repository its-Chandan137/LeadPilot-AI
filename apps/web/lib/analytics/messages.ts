import { getSharedPrismaClient } from "@/lib/prisma";
import type { AnalyticsRange } from "./types";
import { rangeStart } from "./util";

export interface MessageStats {
  avgMessages: number;
  avgResponseLength: number;
  avgDurationMin: number;
}

/**
 * Computes conversation-volume metrics directly from the Message / Conversation
 * tables (not the intelligence layer). Duration is measured from the
 * conversation's createdAt to its last message's createdAt. Response length is
 * the average character length of assistant (bot) messages.
 */
export async function computeMessageStats(opts: {
  projectId?: string;
  range: AnalyticsRange;
  conversationIds?: string[];
}): Promise<MessageStats> {
  const prisma = getSharedPrismaClient();
  const start = rangeStart(opts.range, new Date());

  // When the exact set of analyzed conversations is known, scope to it so the
  // message metrics stay consistent with the reported totalConversations.
  const where: {
    id?: { in: string[] };
    projectId?: string;
    createdAt?: { gte: Date };
  } = {};
  if (opts.conversationIds) {
    where.id = { in: opts.conversationIds };
  } else {
    if (opts.projectId) where.projectId = opts.projectId;
    if (start) where.createdAt = { gte: start };
  }

  const conversations = await prisma.conversation.findMany({
    where,
    select: {
      createdAt: true,
      messages: {
        select: { role: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (conversations.length === 0) {
    return { avgMessages: 0, avgResponseLength: 0, avgDurationMin: 0 };
  }

  let totalMessages = 0;
  let totalResponseLength = 0;
  let responseCount = 0;
  let totalDurationMin = 0;
  let durationCount = 0;

  for (const c of conversations) {
    totalMessages += c.messages.length;

    for (const m of c.messages) {
      if (m.role === "ASSISTANT") {
        totalResponseLength += m.content?.length ?? 0;
        responseCount += 1;
      }
    }

    if (c.messages.length > 0) {
      const last = c.messages[c.messages.length - 1].createdAt;
      const durationMin = (last.getTime() - c.createdAt.getTime()) / 60000;
      if (Number.isFinite(durationMin) && durationMin >= 0) {
        totalDurationMin += durationMin;
        durationCount += 1;
      }
    }
  }

  return {
    avgMessages: Math.round((totalMessages / conversations.length) * 10) / 10,
    avgResponseLength: responseCount ? Math.round(totalResponseLength / responseCount) : 0,
    avgDurationMin: durationCount
      ? Math.round((totalDurationMin / durationCount) * 10) / 10
      : 0
  };
}
