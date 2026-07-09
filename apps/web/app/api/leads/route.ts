import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "LOST"]).optional(),
  score: z.enum(["COLD", "WARM", "HOT"]).optional(),
  search: z.string().trim().max(200).optional(),
  dateRange: z.enum(["today", "7days", "30days", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) return fail("You must be signed in.", 401);

    const prisma = getSharedPrismaClient();
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    if (!membership) return fail("Workspace not found.", 404);

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      projectId: searchParams.get("projectId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      score: searchParams.get("score") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      dateRange: searchParams.get("dateRange") ?? "all",
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "25",
    });
    if (!parsed.success) return fail("Invalid query parameters");

    const { projectId, status, score, search, dateRange, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions: Prisma.Sql[] = [Prisma.sql`p."workspaceId" = ${membership.workspaceId}`];

    if (projectId) conditions.push(Prisma.sql`l."projectId" = ${projectId}`);
    if (status) conditions.push(Prisma.sql`l.status = CAST(${status} AS "LeadStatus")`);
    if (score) conditions.push(Prisma.sql`l.score = CAST(${score} AS "LeadScore")`);

    if (search) {
      const term = `%${search}%`;
      conditions.push(Prisma.sql`(
        l.name ILIKE ${term} OR l.email ILIKE ${term} OR l.phone ILIKE ${term}
        OR l."visitorId" ILIKE ${term} OR p.name ILIKE ${term}
      )`);
    }

    if (dateRange === "today") conditions.push(Prisma.sql`l."createdAt" >= CURRENT_DATE`);
    else if (dateRange === "7days") conditions.push(Prisma.sql`l."createdAt" >= CURRENT_DATE - INTERVAL '7 days'`);
    else if (dateRange === "30days") conditions.push(Prisma.sql`l."createdAt" >= CURRENT_DATE - INTERVAL '30 days'`);

    const where = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    const leads = await prisma.$queryRaw<{
      id: string; name: string | null; email: string | null; phone: string | null;
      visitorId: string; score: string; status: string; source: string;
      createdAt: Date; updatedAt: Date;
      project: { id: string; name: string };
    }[]>`
      SELECT l.id, l.name, l.email, l.phone, l."visitorId",
             l.score, l.status, l.source, l."createdAt", l."updatedAt",
             json_build_object('id', p.id, 'name', p.name) AS project
      FROM "Lead" l
      JOIN "Project" p ON l."projectId" = p.id
      ${where}
      ORDER BY l."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM "Lead" l
      JOIN "Project" p ON l."projectId" = p.id
      ${where}
    `;

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return ok({ leads, pagination: { page, limit, total, totalPages } });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch leads", 500);
  }
}
