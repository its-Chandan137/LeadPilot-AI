import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getEnrichedLeads } from "@/lib/crm";

const querySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "LOST"]).optional(),
  score: z.enum(["COLD", "WARM", "HOT"]).optional(),
  search: z.string().trim().max(200).optional(),
  dateRange: z.enum(["today", "7days", "30days", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  qualification: z.string().optional(),
  industry: z.string().optional(),
  businessType: z.string().optional(),
  visitorStage: z.string().optional(),
  goal: z.string().optional(),
  strategy: z.string().optional(),
  mission: z.string().optional(),
  recommendedAction: z.string().optional(),
  engagementMin: z.coerce.number().int().min(0).max(100).optional(),
  conversationQuality: z.string().optional(),
  product: z.string().optional(),
  painPoint: z.string().optional(),
  hasTimeline: z.enum(["true", "false"]).optional(),
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
      qualification: searchParams.get("qualification") ?? undefined,
      industry: searchParams.get("industry") ?? undefined,
      businessType: searchParams.get("businessType") ?? undefined,
      visitorStage: searchParams.get("visitorStage") ?? undefined,
      goal: searchParams.get("goal") ?? undefined,
      strategy: searchParams.get("strategy") ?? undefined,
      mission: searchParams.get("mission") ?? undefined,
      recommendedAction: searchParams.get("recommendedAction") ?? undefined,
      engagementMin: searchParams.get("engagementMin") ?? undefined,
      conversationQuality: searchParams.get("conversationQuality") ?? undefined,
      product: searchParams.get("product") ?? undefined,
      painPoint: searchParams.get("painPoint") ?? undefined,
      hasTimeline: searchParams.get("hasTimeline") ?? undefined,
    });
    if (!parsed.success) return fail("Invalid query parameters");

    const { page, limit, qualification, industry, businessType, visitorStage, goal, strategy, mission, recommendedAction, engagementMin, conversationQuality, product, painPoint, hasTimeline, ...rest } = parsed.data;

    const result = await getEnrichedLeads({
      workspaceId: membership.workspaceId,
      projectId: rest.projectId,
      status: rest.status,
      score: rest.score,
      search: rest.search,
      dateRange: rest.dateRange,
      page,
      limit,
      filters: {
        qualification,
        industry,
        businessType,
        visitorStage,
        goal,
        strategy,
        mission,
        recommendedAction,
        engagementMin,
        conversationQuality,
        product,
        painPoint,
        hasTimeline: hasTimeline === "true" ? true : hasTimeline === "false" ? false : undefined
      }
    });

    return ok({
      leads: result.leads,
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
    });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch leads", 500);
  }
}
