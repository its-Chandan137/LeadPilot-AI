import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { chunkText, cleanText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/embeddings";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(["TEXT", "URL"]),
  name: z.string().min(1),
  content: z.string().min(1)
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Invalid ingest payload");
    }

    const { projectId, type, name, content } = parsed.data;

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
        type,
        name,
        content,
        status: "PROCESSING"
      }
    });

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
          JSON.stringify(embedding), JSON.stringify({ index: i, name })
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

    return ok({ sourceId: source.id, chunksCreated });
  } catch (error) {
    logger.error(error);
    return fail("Unable to ingest knowledge", 500);
  }
}
