import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const paramsSchema = z.object({
  id: z.string().cuid(),
});

const patchSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "LOST"]).optional(),
  score: z.enum(["COLD", "WARM", "HOT"]).optional(),
}).refine(v => v.status !== undefined || v.score !== undefined, {
  message: "At least one of status or score must be provided",
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) return fail("You must be signed in.", 401);

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) return fail("Invalid lead ID");

    const prisma = getSharedPrismaClient();
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    if (!membership) return fail("Workspace not found.", 404);

    const lead = await prisma.lead.findFirst({
      where: {
        id: parsedParams.data.id,
        project: { workspaceId: membership.workspaceId },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (!lead) return fail("Lead not found.", 404);

    const conversation = lead.conversationId
      ? await prisma.conversation.findUnique({
          where: { id: lead.conversationId },
          select: {
            id: true,
            visitorId: true,
            createdAt: true,
            messages: {
              orderBy: { createdAt: "asc" },
              select: { id: true, role: true, content: true, createdAt: true },
            },
          },
        })
      : null;

    return ok({ ...lead, conversation });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch lead", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) return fail("You must be signed in.", 401);

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) return fail("Invalid lead ID");

    const prisma = getSharedPrismaClient();
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    if (!membership) return fail("Workspace not found.", 404);

    const existing = await prisma.lead.findFirst({
      where: {
        id: parsedParams.data.id,
        project: { workspaceId: membership.workspaceId },
      },
      select: { id: true },
    });

    if (!existing) return fail("Lead not found.", 404);

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid fields. Only status and score can be updated.");

    const updated = await prisma.lead.update({
      where: { id: parsedParams.data.id },
      data: parsed.data,
      select: { id: true, status: true, score: true },
    });

    const headers = corsHeaders();
    return NextResponse.json({ success: true, data: updated }, { headers });
  } catch (error) {
    logger.error(error);
    return fail("Unable to update lead", 500);
  }
}
