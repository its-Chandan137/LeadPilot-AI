import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { extractLeadInfo } from "@/lib/lead-extractor";

const paramsSchema = z.object({
  id: z.string().cuid()
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return fail("You must be signed in.", 401);
    }

    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return fail("Invalid conversation ID");
    }

    const prisma = getSharedPrismaClient();

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true }
    });

    if (!membership) {
      return fail("Workspace not found.", 404);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        project: {
          select: { id: true, workspaceId: true }
        },
        messages: {
          orderBy: { createdAt: "asc" },
          where: { role: "USER" },
          select: { content: true }
        }
      }
    });

    if (!conversation || conversation.project.workspaceId !== membership.workspaceId) {
      return fail("Conversation not found.", 404);
    }

    // Idempotent: a Lead is unique per (projectId, visitorId), NOT per
    // conversation. Mirror the auto-capture key in app/api/widget/chat/route.ts
    // so converting a second conversation from the same visitor returns the
    // existing lead instead of violating the unique constraint.
    const existing = await prisma.lead.findFirst({
      where: {
        projectId: conversation.projectId,
        visitorId: conversation.visitorId
      }
    });

    if (existing) {
      return ok({ lead: existing, alreadyExisted: true });
    }

    // Reuse the exact same source of truth as the auto-capture path
    // (app/api/widget/chat/route.ts) — extract contact info from the
    // visitor's own messages.
    const leadData: { name?: string; email?: string; phone?: string } = {};
    for (const msg of conversation.messages) {
      const info = extractLeadInfo(msg.content);
      if (info.name && !leadData.name) leadData.name = info.name;
      if (info.email && !leadData.email) leadData.email = info.email;
      if (info.phone && !leadData.phone) leadData.phone = info.phone;
    }

    const lead = await prisma.lead.create({
      data: {
        projectId: conversation.projectId,
        visitorId: conversation.visitorId,
        conversationId: conversation.id,
        name: leadData.name ?? null,
        email: leadData.email ?? null,
        phone: leadData.phone ?? null,
        status: "NEW",
        source: "MANUAL",
        score: "COLD"
      }
    });

    return ok({ lead, alreadyExisted: false });
  } catch (error) {
    logger.error(error);
    return fail("Unable to convert conversation to lead", 500);
  }
}
