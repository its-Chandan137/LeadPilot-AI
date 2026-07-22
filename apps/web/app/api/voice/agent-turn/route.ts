import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { getChannelHistory, saveChannelTurn } from "@/lib/widget-store";
import { getConversationMemory } from "@/lib/conversation-memory";
import { getConfiguredObjectives } from "@/lib/objectives";
import { runAIOS } from "@/lib/ai-os";
import { persistConversation } from "@/lib/intelligence-store";
import { runRagAgent } from "@/lib/rag-agent";
import { extractLeadInfo, hasLeadData } from "@/lib/lead-extractor";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  projectId: z.string().min(1),
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
  skipRagRefresh: z.boolean().optional().default(false),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Shared "AI brain" turn for the Voice Agent.
 *
 * This endpoint runs the EXACT same pipeline as the chat widget
 * (apps/web/app/api/widget/chat/route.ts): it loads the voice conversation
 * history + memory, retrieves knowledge via pgvector + Gemini, builds the
 * identical system prompt, calls the same Groq model, parses the structured
 * response, runs the full AIOS intelligence pipeline, persists it, updates
 * memory, extracts lead info and saves the transcript turn. The LiveKit agent
 * only handles speech (STT/TTS) and calls this endpoint per utterance.
 */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid voice turn payload");
    }

    const { projectId, conversationId, message, skipRagRefresh } = parsed.data;
    const prisma = getSharedPrismaClient();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, widgetConfig: true }
    });

    if (!project) {
      return fail("Project not found", 404);
    }

    const history = await getChannelHistory(conversationId, "voice");
    const memory = getConversationMemory(conversationId);

    // Run the shared brain: retrieval -> prompt -> OpenAI (voice) -> parse ->
    // memory merge. Chat widget keeps using Groq via the default provider.
    const structured = await runRagAgent({
      conversationId,
      projectId: project.id,
      projectName: project.name,
      message,
      history,
      memory,
      widgetConfig: project.widgetConfig,
      modelProvider: "openai",
      skipRagRefresh,
    });

    const configuredObjectives = getConfiguredObjectives(project.widgetConfig);
    const updatedMemory = structured.updatedMemory ?? getConversationMemory(conversationId);

    // Run the full AIOS intelligence pipeline (backend-only), identical to chat.
    const aiOS = runAIOS({
      conversationId,
      history,
      memory: updatedMemory,
      analysis: structured.analysis,
      recommendation: structured.recommendation,
      configuredObjectives
    });

    // Persist intelligence durably (backend-only). Swallowed so a failure never
    // breaks the visitor's spoken reply.
    try {
      await persistConversation(conversationId, aiOS, project.id);
    } catch (persistError) {
      logger.error(persistError);
    }

    // Persist the voice transcript turn (USER + ASSISTANT) for history.
    await saveChannelTurn({
      conversationId,
      channel: "voice",
      message,
      reply: structured.reply
    }).catch((error) => logger.error(error));

    // Extract lead info from the spoken message (same logic as chat).
    const leadData = extractLeadInfo(message);
    if (hasLeadData(leadData)) {
      const voiceConversation = await prisma.voiceConversation.findUnique({
        where: { id: conversationId },
        select: { visitorId: true }
      });
      const visitorId = voiceConversation?.visitorId ?? null;

      const existing = await prisma.lead.findFirst({
        where: { projectId: project.id, visitorId: visitorId ?? "__none__" },
        select: { id: true, name: true, email: true, phone: true }
      });

      if (existing) {
        const updates: string[] = [];
        const values: unknown[] = [];
        if (leadData.name && !existing.name) { updates.push(`name = $${updates.length + 1}`); values.push(leadData.name); }
        if (leadData.email && !existing.email) { updates.push(`email = $${updates.length + 1}`); values.push(leadData.email); }
        if (leadData.phone && !existing.phone) { updates.push(`phone = $${updates.length + 1}`); values.push(leadData.phone); }
        if (updates.length > 0) {
          updates.push(`"conversationId" = $${updates.length + 1}`); values.push(conversationId);
          updates.push(`"updatedAt" = NOW()`);
          values.push(existing.id);
          await prisma.$executeRawUnsafe(
            `UPDATE "Lead" SET ${updates.join(", ")} WHERE id = $${values.length}`,
            ...values
          );
        }
      } else if (visitorId) {
        await prisma.lead.create({
          data: {
            projectId: project.id,
            visitorId,
            conversationId,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone
          }
        });
      }
    }

    return ok({ reply: structured.reply });
  } catch (error) {
    logger.error(error);
    return fail("Unable to process voice turn", 500);
  }
}
