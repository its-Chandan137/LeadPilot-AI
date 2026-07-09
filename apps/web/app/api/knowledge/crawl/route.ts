import { NextResponse } from "next/server";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { chunkText, cleanText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/embeddings";
import { crawlUrl } from "@/lib/crawler";
import { logger } from "@/lib/logger";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  let sourceId: string | null = null;

  try {
    const body = await request.json();
    const { projectId, url, name } = body;

    if (!projectId) {
      return fail("projectId is required");
    }
    if (!url) {
      return fail("url is required");
    }
    if (!name) {
      return fail("name is required");
    }

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.protocol.startsWith("http")) {
        return fail("url must start with http or https");
      }
    } catch {
      return fail("Invalid URL format");
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return fail("Unauthorized", 401);
    }

    const prisma = getSharedPrismaClient();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true }
    });

    if (!project) {
      return fail("Project not found", 404);
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: user.id
      }
    });

    if (!membership) {
      return fail("Unauthorized", 403);
    }

    const source = await prisma.knowledgeSource.create({
      data: {
        projectId,
        type: "URL",
        name,
        content: url,
        status: "PROCESSING"
      }
    });

    sourceId = source.id;

    const { title, content, pagesVisited } = await crawlUrl(url);

    if (!content || content.trim().length === 0) {
      await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: "FAILED" }
      });
      return fail("No content found at URL");
    }

    const cleanedContent = cleanText(content);
    const chunks = chunkText(cleanedContent);

    let chunksCreated = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i]);
        const chunkId = crypto.randomUUID();

        await prisma.$executeRawUnsafe(
          `INSERT INTO "KnowledgeChunk" (id, "projectId", "sourceId", content, embedding, metadata, "createdAt")
           VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb, NOW())`,
          chunkId, projectId, source.id, chunks[i],
          JSON.stringify(embedding), JSON.stringify({ index: i, name, url, pagesVisited: pagesVisited.length })
        );

        chunksCreated++;
      } catch (error) {
        logger.error(error);
      }
    }

    await prisma.knowledgeSource.update({
      where: { id: source.id },
      data: { status: chunksCreated > 0 ? "READY" : "FAILED" }
    });

    return ok({ sourceId: source.id, chunksCreated, pagesVisited: pagesVisited.length });
  } catch (error) {
    logger.error(error);

    if (sourceId) {
      try {
        const prisma = getSharedPrismaClient();
        await prisma.knowledgeSource.update({
          where: { id: sourceId },
          data: { status: "FAILED" }
        });
      } catch {}
    }

    return fail("Unable to crawl website", 500);
  }
}
