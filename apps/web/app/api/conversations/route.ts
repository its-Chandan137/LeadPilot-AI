import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getPersistedIntelligence } from "@/lib/crm";

const querySchema = z.object({
  projectId: z.string().cuid().optional(),
  search: z.string().trim().max(200).optional(),
  dateRange: z.enum(["today", "7days", "30days", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      projectId: searchParams.get("projectId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      dateRange: searchParams.get("dateRange") ?? "all",
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "25"
    });

    if (!parsed.success) {
      return fail("Invalid query parameters");
    }

    const { projectId, search, dateRange, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const dateFilter = buildDateFilter(dateRange);
    const projectFilter = projectId
      ? Prisma.sql`AND c."projectId" = ${projectId}`
      : Prisma.empty;
    const searchFilter = search
      ? Prisma.sql`AND (
        c."visitorId" ILIKE ${`%${search}%`}
        OR p.name ILIKE ${`%${search}%`}
        OR l.name ILIKE ${`%${search}%`}
        OR l.email ILIKE ${`%${search}%`}
        OR l.phone ILIKE ${`%${search}%`}
        OR latest_msg.content ILIKE ${`%${search}%`}
      )`
      : Prisma.empty;

    const conversations = await prisma.$queryRaw<
      {
        id: string;
        visitorId: string;
        createdAt: Date;
        project: { id: string; name: string };
        lead: { name: string | null; email: string | null; phone: string | null } | null;
        latestMessage: string | null;
        latestMessageAt: Date | null;
        messageCount: number;
      }[]
    >`
      SELECT
        c.id,
        c."visitorId",
        c."createdAt",
        json_build_object('id', p.id, 'name', p.name) AS project,
        CASE
          WHEN l.id IS NOT NULL THEN json_build_object('name', l.name, 'email', l.email, 'phone', l.phone)
          ELSE NULL
        END AS lead,
        latest_msg.content AS "latestMessage",
        latest_msg."createdAt" AS "latestMessageAt",
        COALESCE(msg_count.count, 0)::int AS "messageCount"
      FROM "Conversation" c
      JOIN "Project" p ON c."projectId" = p.id
      LEFT JOIN "Lead" l ON l."conversationId" = c.id
      LEFT JOIN LATERAL (
        SELECT m.content, m."createdAt"
        FROM "Message" m
        WHERE m."conversationId" = c.id
        ORDER BY m."createdAt" DESC
        LIMIT 1
      ) latest_msg ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM "Message" m
        WHERE m."conversationId" = c.id
      ) msg_count ON true
      WHERE p."workspaceId" = ${membership.workspaceId}
        ${projectFilter}
        ${searchFilter}
        ${dateFilter}
      ORDER BY c."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM "Conversation" c
      JOIN "Project" p ON c."projectId" = p.id
      LEFT JOIN "Lead" l ON l."conversationId" = c.id
      LEFT JOIN LATERAL (
        SELECT m.content, m."createdAt"
        FROM "Message" m
        WHERE m."conversationId" = c.id
        ORDER BY m."createdAt" DESC
        LIMIT 1
      ) latest_msg ON true
      WHERE p."workspaceId" = ${membership.workspaceId}
        ${projectFilter}
        ${searchFilter}
        ${dateFilter}
    `;

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const enriched = await Promise.all(
      conversations.map(async (c) => ({
        ...c,
        intelligence: await getPersistedIntelligence(c.id)
      }))
    );

    return ok({
      conversations: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch conversations", 500);
  }
}

function buildDateFilter(dateRange: string): Prisma.Sql {
  switch (dateRange) {
    case "today":
      return Prisma.sql`AND c."createdAt" >= CURRENT_DATE`;
    case "7days":
      return Prisma.sql`AND c."createdAt" >= CURRENT_DATE - INTERVAL '7 days'`;
    case "30days":
      return Prisma.sql`AND c."createdAt" >= CURRENT_DATE - INTERVAL '30 days'`;
    default:
      return Prisma.empty;
  }
}
