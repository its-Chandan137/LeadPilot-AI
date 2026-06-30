import { getSharedPrismaClient } from "./prisma";
import { generateEmbedding } from "./embeddings";

export async function retrieveRelevantChunks(
  projectId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  const prisma = getSharedPrismaClient();
  const queryEmbedding = await generateEmbedding(query);

  const results = await prisma.$queryRawUnsafe<{ content: string }[]>(
    `SELECT content
     FROM "KnowledgeChunk"
     WHERE "projectId" = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    projectId,
    JSON.stringify(queryEmbedding),
    limit
  );

  return results.map(r => r.content);
}
