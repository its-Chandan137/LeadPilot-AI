import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { getLiveDashboard } from "@/lib/crm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

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
      select: { workspaceId: true }
    });
    if (!membership) return fail("Workspace not found.", 404);

    const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;

    const data = await getLiveDashboard({ workspaceId: membership.workspaceId, projectId });
    return ok(data);
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch dashboard", 500);
  }
}
