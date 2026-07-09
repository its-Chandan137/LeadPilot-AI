import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return fail("You must be signed in.", 401);
    }

    const prisma = getSharedPrismaClient();

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true }
    });

    if (!membership) {
      return fail("Workspace not found.", 404);
    }

    const workspaceId = membership.workspaceId;

    const [
      totalConversations,
      totalMessages,
      totalLeads,
      totalProjects,
      totalKnowledgeSources,
      rawConversationTrend,
      rawLeadTrend,
      recentConversations,
      recentLeads
    ] = await Promise.all([
      prisma.conversation.count({
        where: { project: { workspaceId } }
      }),
      prisma.message.count({
        where: { conversation: { project: { workspaceId } } }
      }),
      prisma.lead.count({
        where: { project: { workspaceId } }
      }),
      prisma.project.count({
        where: { workspaceId }
      }),
      prisma.knowledgeSource.count({
        where: { project: { workspaceId } }
      }),
      prisma.$queryRaw<{ date: Date; count: number }[]>`
        SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
        FROM "Conversation"
        WHERE "projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${workspaceId})
          AND "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      prisma.$queryRaw<{ date: Date; count: number }[]>`
        SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
        FROM "Lead"
        WHERE "projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${workspaceId})
          AND "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      prisma.conversation.findMany({
        where: { project: { workspaceId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          visitorId: true,
          createdAt: true,
          project: { select: { name: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, createdAt: true }
          }
        }
      }),
      prisma.lead.findMany({
        where: { project: { workspaceId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          project: { select: { name: true } }
        }
      })
    ]);

    const conversationTrend = fillDayGaps(rawConversationTrend, 7);
    const leadTrend = fillDayGaps(rawLeadTrend, 7);

    const recentActivity = await buildRecentActivity(prisma, workspaceId);

    return ok({
      stats: {
        conversations: totalConversations,
        messages: totalMessages,
        leads: totalLeads,
        projects: totalProjects,
        knowledgeSources: totalKnowledgeSources
      },
      conversationTrend,
      leadTrend,
      recentConversations: recentConversations.map((c) => ({
        id: c.id,
        visitorId: c.visitorId,
        projectName: c.project.name,
        lastMessage: c.messages[0]?.content ?? null,
        lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
        createdAt: c.createdAt
      })),
      recentLeads: recentLeads.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        status: l.status,
        projectName: l.project.name,
        createdAt: l.createdAt
      })),
      recentActivity
    });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch dashboard data", 500);
  }
}

function fillDayGaps(
  raw: { date: Date; count: number }[],
  days: number
): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const match = raw.find(
      (r) => r.date.toISOString().slice(0, 10) === dateStr
    );
    result.push({ date: dateStr, count: match?.count ?? 0 });
  }
  return result;
}

async function buildRecentActivity(
  prisma: ReturnType<typeof getSharedPrismaClient>,
  workspaceId: string
) {
  const [conversations, leads, sources] = await Promise.all([
    prisma.conversation.findMany({
      where: { project: { workspaceId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        visitorId: true,
        createdAt: true,
        project: { select: { name: true } }
      }
    }),
    prisma.lead.findMany({
      where: { project: { workspaceId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        createdAt: true,
        project: { select: { name: true } }
      }
    }),
    prisma.knowledgeSource.findMany({
      where: { project: { workspaceId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        createdAt: true,
        project: { select: { name: true } }
      }
    })
  ]);

  const items: ActivityItem[] = [];

  for (const c of conversations) {
    items.push({
      id: c.id,
      type: "conversation",
      title: `Conversation started with Visitor ${c.visitorId.slice(-6).toUpperCase()}`,
      projectName: c.project.name,
      createdAt: c.createdAt
    });
  }

  for (const l of leads) {
    items.push({
      id: l.id,
      type: "lead",
      title: l.name
        ? `Lead captured: ${l.name}`
        : "Lead captured",
      projectName: l.project.name,
      createdAt: l.createdAt
    });
  }

  for (const s of sources) {
    items.push({
      id: s.id,
      type: "knowledge",
      title: `Knowledge source added: ${s.name}`,
      projectName: s.project.name,
      createdAt: s.createdAt
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, 10);
}

type ActivityItem = {
  id: string;
  type: "conversation" | "lead" | "knowledge";
  title: string;
  projectName: string;
  createdAt: Date;
};
