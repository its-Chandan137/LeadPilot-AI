import { getSharedPrismaClient } from "@/lib/prisma";
import { chunkText, cleanText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/embeddings";
import { logger } from "@/lib/logger";

export type SocialPlatform = "LINKEDIN" | "INSTAGRAM" | "FACEBOOK" | "TWITTER";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TWITTER: "Twitter/X",
};

export function normalizePlatform(input: string): SocialPlatform | null {
  const upper = input.trim().toUpperCase();
  if (upper === "TWITTER" || upper === "TWITTER/X" || upper === "X") return "TWITTER";
  if (upper === "LINKEDIN") return "LINKEDIN";
  if (upper === "INSTAGRAM") return "INSTAGRAM";
  if (upper === "FACEBOOK") return "FACEBOOK";
  return null;
}

export function normalizeProfileUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = "https://" + candidate;
  }

  try {
    const parsed = new URL(candidate);
    if (!parsed.protocol.startsWith("http")) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

export async function ingestSocialSource({
  projectId,
  platform,
  content,
  profileUrl,
  name,
}: {
  projectId: string;
  platform: SocialPlatform;
  content: string;
  profileUrl?: string;
  name: string;
}): Promise<{ sourceId: string; chunksCreated: number } | { error: string }> {
  const prisma = getSharedPrismaClient();

  let source;
  try {
    source = await prisma.knowledgeSource.create({
      data: {
        projectId,
        type: "SOCIAL",
        name,
        content,
        status: "PROCESSING",
      },
    });
  } catch (error) {
    logger.error(error);
    return { error: "Failed to create knowledge source" };
  }

  try {
    const cleaned = cleanText(content);
    const chunks = chunkText(cleaned);

    const platformLabel = PLATFORM_LABELS[platform];
    const attribution = profileUrl
      ? `From ${name}'s ${platformLabel} profile ( ${profileUrl}):\n\n`
      : `From ${name}'s ${platformLabel} profile:\n\n`;

    let chunksCreated = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const attributedBody = attribution + chunks[i];
        const embedding = await generateEmbedding(attributedBody);
        const chunkId = crypto.randomUUID();

        const metadata: Record<string, unknown> = { index: i, name, platform };
        if (profileUrl) {
          metadata.profileUrl = profileUrl;
        }

        await prisma.$executeRawUnsafe(
          `INSERT INTO "KnowledgeChunk" (id, "projectId", "sourceId", content, embedding, metadata, "createdAt")
           VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb, NOW())`,
          chunkId,
          projectId,
          source.id,
          attributedBody,
          JSON.stringify(embedding),
          JSON.stringify(metadata)
        );

        chunksCreated++;
      } catch (error) {
        logger.error(error);
      }
    }

    await prisma.knowledgeSource.update({
      where: { id: source.id },
      data: { status: chunksCreated > 0 ? "READY" : "FAILED" },
    });

    return { sourceId: source.id, chunksCreated };
  } catch (error) {
    logger.error(error);

    try {
      await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: "FAILED" },
      });
    } catch {}

    return { error: "Failed to ingest social content" };
  }
}
