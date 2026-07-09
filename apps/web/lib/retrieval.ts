import { getSharedPrismaClient } from "./prisma";
import { generateEmbedding } from "./embeddings";
import { logger } from "./logger";

export async function retrieveRelevantChunks(
  projectId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  try {
    const prisma = getSharedPrismaClient();
    const queryEmbedding = await generateEmbedding(query);
    const vectorString = `[${queryEmbedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe<{ content: string }[]>(
      `SELECT content
       FROM "KnowledgeChunk"
       WHERE "projectId" = $1
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      projectId,
      vectorString,
      limit
    );

    return results.map((r) => r.content);
  } catch (error) {
    logger.error(error);
    return [];
  }
}
