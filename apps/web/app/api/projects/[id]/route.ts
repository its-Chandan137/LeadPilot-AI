import { NextResponse } from "next/server";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const project = await prisma.project.findFirst({
      where: { id: params.id, workspaceId: membership.workspaceId },
      select: { id: true },
    });
    if (!project) return fail("Project not found.", 404);

    await prisma.project.delete({
      where: { id: project.id },
    });

    return ok({ success: true });
  } catch (error) {
    logger.error(error);
    return fail("Unable to delete project", 500);
  }
}
