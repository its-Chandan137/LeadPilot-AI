import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { findProjectByClientId, saveChatTurn, getConversationHistory } from "@/lib/widget-store";
import { isOriginAllowed } from "@/lib/validate-origin";
import { getSharedPrismaClient } from "@/lib/prisma";
import { getConversationMemory, type ConversationMemory } from "@/lib/conversation-memory";
import { getConfiguredObjectives } from "@/lib/objectives";
import { runAIOS } from "@/lib/ai-os";
import { persistConversation } from "@/lib/intelligence-store";
import { runRagAgent, type RagAgentResult } from "@/lib/rag-agent";
import type { AIConversationResponse } from "@/lib/ai-response";
import { logger } from "@/lib/logger";
import { extractLeadInfo, hasLeadData } from "@/lib/lead-extractor";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  clientId: z.string().min(1),
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
  visitorId: z.string().min(1)
});

async function getRagReply(
  conversationId: string,
  projectId: string,
  projectName: string,
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  memory: ConversationMemory,
  widgetConfig?: unknown
): Promise<RagAgentResult> {
  const result = await runRagAgent({
    conversationId,
    projectId,
    projectName,
    message,
    history,
    memory,
    widgetConfig
  });
  return result;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid chat payload");
    }

    const { clientId, message } = parsed.data;

    const project = await findProjectByClientId(clientId);

    let reply: string;

    if (project) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");

      if (!isOriginAllowed(origin, referer, project.siteUrl)) {
        return fail("Widget is not authorized for this domain", 403);
      }

      try {
        const prisma = getSharedPrismaClient();
        const chunkCount = await prisma.knowledgeChunk.count({
          where: { projectId: project.id }
        });

        if (chunkCount > 0) {
          const conversationId = parsed.data.conversationId;
          const history = await getConversationHistory(conversationId);
          // Load the durable conversation memory and let the model see it.
          const memory = getConversationMemory(conversationId);
          const structured = await getRagReply(conversationId, project.id, project.name, message, history, memory, project.widgetConfig);
          // The brain already merged any newly learned durable facts into memory
          // (keyed by conversationId) — use that updated memory for AIOS.
          const configuredObjectives = getConfiguredObjectives(project.widgetConfig);
          const updatedMemory = structured.updatedMemory ?? getConversationMemory(conversationId);

          const aiOS = runAIOS({
            conversationId,
            history,
            memory: updatedMemory,
            analysis: structured.analysis,
            recommendation: structured.recommendation,
            configuredObjectives
          });

          structured.leadScore = aiOS.lead.score;
          structured.qualification = aiOS.lead.qualification;
          structured.scoreReasons = aiOS.lead.scoreReasons;
          structured.completedObjectives = aiOS.lead.completedObjectives;
          structured.pendingObjectives = aiOS.lead.pendingObjectives;
          structured.actionEngine = aiOS.nextAction;
          structured.conversationIntelligence = aiOS.conversation;
          structured.aiOS = aiOS;

          // Persist the generated intelligence durably (backend-only). Wrapped so
          // a persistence failure never breaks the visitor's chat response.
          try {
            await persistConversation(conversationId, aiOS, project.id);
          } catch (persistError) {
            logger.error(persistError);
          }

          // The widget receives only the reply. The rest of the structured
          // response (memoryUpdates, analysis, recommendation, lead fields,
          // action engine, intelligence, AI OS) stays backend-only.
          reply = structured.reply;
        } else {
          reply = "Sorry, I don't have access to your site information yet. Add content to your Knowledge Base to enable AI responses.";
        }
      } catch (error) {
        logger.error(error);
        reply = "Hi! How can I help you today?";
      }
    } else {
      reply = "Hi! How can I help you today?";
    }

    await saveChatTurn({
      clientId: parsed.data.clientId,
      visitorId: parsed.data.visitorId,
      conversationId: parsed.data.conversationId,
      message: parsed.data.message,
      reply
    }).catch((error) => {
      logger.error(error);
    });

    if (project) {
      const leadData = extractLeadInfo(parsed.data.message);
      if (hasLeadData(leadData)) {
        const prisma = getSharedPrismaClient();

        const existing = await prisma.$queryRaw<{ id: string; name: string | null; email: string | null; phone: string | null }[]>`
          SELECT id, name, email, phone FROM "Lead"
          WHERE "projectId" = ${project.id} AND "visitorId" = ${parsed.data.visitorId}
          LIMIT 1
        `;
        const lead = existing[0] ?? null;

        if (lead) {
          const updates: string[] = [];
          const values: unknown[] = [];
          if (leadData.name)   { updates.push(`name = $${updates.length + 1}`);  values.push(leadData.name); }
          if (leadData.email)  { updates.push(`email = $${updates.length + 1}`); values.push(leadData.email); }
          if (leadData.phone)  { updates.push(`phone = $${updates.length + 1}`); values.push(leadData.phone); }
          updates.push(`"conversationId" = $${updates.length + 1}`); values.push(parsed.data.conversationId);
          updates.push(`"updatedAt" = NOW()`);
          values.push(lead.id);
          await prisma.$executeRawUnsafe(
            `UPDATE "Lead" SET ${updates.join(", ")} WHERE id = $${values.length}`,
            ...values
          );
        } else {
          await prisma.$queryRaw`
            INSERT INTO "Lead" (id, "projectId", "visitorId", "conversationId", name, email, phone, score, status, source, "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid(), ${project.id}, ${parsed.data.visitorId}, ${parsed.data.conversationId},
              ${leadData.name ?? null}, ${leadData.email ?? null}, ${leadData.phone ?? null},
              'COLD', 'NEW', 'CHAT', NOW(), NOW()
            )
          `;
        }
      }
    }

    return ok({
      conversationId: parsed.data.conversationId,
      reply
    });
  } catch (error) {
    logger.error(error);
    return fail("Unable to send message", 500);
  }
}
