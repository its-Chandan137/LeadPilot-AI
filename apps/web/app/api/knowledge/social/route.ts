import { NextResponse } from "next/server";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  ingestSocialSource,
  normalizePlatform,
  normalizeProfileUrl,
} from "@/lib/social-ingest";
import { logger } from "@/lib/logger";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, platform: rawPlatform, content, profileUrl: rawProfileUrl, name } = body;

    if (!projectId) {
      return fail("projectId is required");
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return fail("content is required and must be non-empty");
    }

    const platform = normalizePlatform(rawPlatform);
    if (!platform) {
      return fail("platform must be one of: LinkedIn, Instagram, Facebook, Twitter/X");
    }

    const profileUrl = normalizeProfileUrl(rawProfileUrl);
    const sourceName = (typeof name === "string" && name.trim().length > 0)
      ? name.trim()
      : `${platform} Profile`;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return fail("Unauthorized", 401);
    }

    const prisma = getSharedPrismaClient();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });

    if (!project) {
      return fail("Project not found", 404);
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: user.id,
      },
    });

    if (!membership) {
      return fail("Unauthorized", 403);
    }

    const result = await ingestSocialSource({
      projectId,
      platform,
      content: content.trim(),
      profileUrl,
      name: sourceName,
    });

    if ("error" in result) {
      return fail(result.error, 500);
    }

    return ok({ sourceId: result.sourceId, chunksCreated: result.chunksCreated });
  } catch (error) {
    logger.error(error);
    return fail("Unable to ingest social content", 500);
  }
}
