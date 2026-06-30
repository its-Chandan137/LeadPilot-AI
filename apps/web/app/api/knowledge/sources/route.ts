import { NextResponse } from "next/server";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return fail("Missing projectId");
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return fail("Unauthorized", 401);
    }

    const prisma = getSharedPrismaClient();

    const sources = await prisma.knowledgeSource.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { chunks: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return ok({ sources });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch sources", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return fail("Missing id");
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return fail("Unauthorized", 401);
    }

    const prisma = getSharedPrismaClient();

    await prisma.knowledgeChunk.deleteMany({
      where: { sourceId: id }
    });

    await prisma.knowledgeSource.delete({
      where: { id }
    });

    return ok({ deleted: true });
  } catch (error) {
    logger.error(error);
    return fail("Unable to delete source", 500);
  }
}
