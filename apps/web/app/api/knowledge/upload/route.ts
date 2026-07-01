import { NextResponse } from "next/server";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { chunkText, cleanText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/embeddings";
import { extractTextFromBuffer } from "@/lib/document-extractor";
import { logger } from "@/lib/logger";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const name = formData.get("name") as string | null;

    if (!file) {
      return fail("File is required");
    }
    if (!projectId) {
      return fail("projectId is required");
    }
    if (!name) {
      return fail("name is required");
    }

    if (file.size > MAX_SIZE) {
      return fail("File size exceeds 10MB limit");
    }

    const isAllowedType = ALLOWED_TYPES.includes(file.type) ||
      file.name.endsWith(".pdf") ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".txt");

    if (!isAllowedType) {
      return fail("Only PDF, DOCX, and TXT files are supported");
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
        type: "DOCUMENT",
        name,
        content: file.name,
        status: "PROCESSING"
      }
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer, file.type, file.name);

    if (!text || text.trim().length === 0) {
      await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: "FAILED" }
      });
      return fail("No text content extracted from document");
    }

    const cleanedContent = cleanText(text);
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
          JSON.stringify(embedding), JSON.stringify({ index: i, name, filename: file.name })
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

    return ok({ sourceId: source.id, chunksCreated, filename: file.name });
  } catch (error) {
    logger.error(error);
    return fail("Unable to upload document", 500);
  }
}
