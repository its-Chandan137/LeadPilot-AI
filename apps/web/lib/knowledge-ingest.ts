import { getSharedPrismaClient } from "@/lib/prisma";
import { crawlUrl } from "@/lib/crawler";
import { chunkText, cleanText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/embeddings";
import { extractBrand } from "@/lib/brand-extract";
import { logger } from "@/lib/logger";

export async function ingestUrlForProject({
  projectId,
  sourceId,
  url,
  name,
}: {
  projectId: string;
  sourceId: string;
  url: string;
  name: string;
}): Promise<void> {
  try {
    const prisma = getSharedPrismaClient();

    const { title, content, pagesVisited } = await crawlUrl(url);

    if (!content || content.trim().length === 0) {
      await prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: "FAILED" },
      });
      return;
    }

    const cleaned = cleanText(content);
    const chunks = chunkText(cleaned);

    let chunksCreated = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i]);
        const chunkId = crypto.randomUUID();

        await prisma.$executeRawUnsafe(
          `INSERT INTO "KnowledgeChunk" (id, "projectId", "sourceId", content, embedding, metadata, "createdAt")
           VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb, NOW())`,
          chunkId,
          projectId,
          sourceId,
          chunks[i],
          JSON.stringify(embedding),
          JSON.stringify({ index: i, name, url, pagesVisited: pagesVisited.length })
        );

        chunksCreated++;
      } catch (err) {
        logger.error(err);
      }
    }

    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: chunksCreated > 0 ? "READY" : "FAILED" },
    });
  } catch (error) {
    logger.error(error);

    try {
      const prisma = getSharedPrismaClient();
      await prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: "FAILED" },
      });
    } catch {}
  }
}

export async function extractBrandForProject({
  projectId,
  url,
}: {
  projectId: string;
  url: string;
}): Promise<void> {
  try {
    const prisma = getSharedPrismaClient();
    const result = await extractBrand(url);
    if (!result || result.colors.length === 0) return;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { widgetConfig: true },
    });
    if (!project) return;

    const existing = (project.widgetConfig ?? {}) as Record<string, unknown>;
    existing.brand = {
      colors: result.colors,
      logoUrl: result.logoUrl,
      extractedAt: new Date().toISOString(),
    };
    if (!existing.color) {
      existing.color = result.colors[0];
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { widgetConfig: existing as any },
    });
  } catch (error) {
    logger.error(error);
  }
}
