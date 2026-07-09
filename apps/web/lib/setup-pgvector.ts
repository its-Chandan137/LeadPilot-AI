import { getSharedPrismaClient } from "./prisma";

export async function setupPgVector() {
  const prisma = getSharedPrismaClient();
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
    ON "KnowledgeChunk" 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `);
}
