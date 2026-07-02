import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const paramsSchema = z.object({
  id: z.string().cuid()
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
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
          select: {
            id: true,
            name: true,
            workspaceId: true
          }
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true
          }
        }
      }
    });

    if (!conversation || conversation.project.workspaceId !== membership.workspaceId) {
      return fail("Conversation not found.", 404);
    }

    const lead = await prisma.lead.findUnique({
      where: {
        projectId_visitorId: {
          projectId: conversation.projectId,
          visitorId: conversation.visitorId
        }
      }
    });

    return ok({
      conversation: {
        id: conversation.id,
        visitorId: conversation.visitorId,
        createdAt: conversation.createdAt,
        projectId: conversation.projectId
      },
      project: conversation.project,
      lead,
      messages: conversation.messages
    });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch conversation", 500);
  }
}
