import { NextResponse } from "next/server";
import { z } from "zod";
import Groq from "groq-sdk";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { findProjectByClientId, saveChatTurn } from "@/lib/widget-store";
import { getSharedPrismaClient } from "@/lib/prisma";
import { retrieveRelevantChunks } from "@/lib/retrieval";
import { logger } from "@/lib/logger";
import { extractLeadInfo, hasLeadData } from "@/lib/lead-extractor";

const bodySchema = z.object({
  clientId: z.string().min(1),
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
  visitorId: z.string().min(1)
});

const hardcodedReplies: Record<string, string> = {
  hi: "Hello! How can I help you today?",
  hello: "Hi there! What can I do for you?",
  help: "Sure, I'm here to help! What do you need?",
  bye: "Goodbye! Have a great day!",
  default: "Thanks for reaching out! Our team will get back to you shortly."
};

function getHardcodedReply(message: string) {
  const normalized = message.toLowerCase();
  const matchedKey = Object.keys(hardcodedReplies).find((key) => normalized.includes(key));
  return hardcodedReplies[matchedKey ?? "default"];
}

async function getRagReply(projectId: string, projectName: string, message: string): Promise<string> {
  const chunks = await retrieveRelevantChunks(projectId, message);

  if (chunks.length === 0) {
    return getHardcodedReply(message);
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const systemPrompt = `You are a helpful AI assistant for ${projectName}. Answer questions based ONLY on the following context. If the answer is not in the context, say you don't have that information but offer to connect them with the team. Keep answers concise and friendly.

Context:
${chunks.join("\n\n---\n\n")}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    max_tokens: 500,
    temperature: 0.3
  });

  return completion.choices[0]?.message?.content ?? "I could not generate a response.";
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
      try {
        const prisma = getSharedPrismaClient();
        const chunkCount = await prisma.knowledgeChunk.count({
          where: { projectId: project.id }
        });

        if (chunkCount > 0) {
          reply = await getRagReply(project.id, project.name, message);
        } else {
          reply = getHardcodedReply(message);
        }
      } catch (error) {
        logger.error(error);
        reply = getHardcodedReply(message);
      }
    } else {
      reply = getHardcodedReply(message);
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
        const existing = await prisma.lead.findFirst({
          where: { conversationId: parsed.data.conversationId },
          select: { id: true, name: true, email: true, phone: true },
        });

        if (existing) {
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              ...(leadData.name && !existing.name && { name: leadData.name }),
              ...(leadData.email && !existing.email && { email: leadData.email }),
              ...(leadData.phone && !existing.phone && { phone: leadData.phone }),
            },
          });
        } else {
          await prisma.lead.create({
            data: {
              projectId: project.id,
              visitorId: parsed.data.visitorId,
              conversationId: parsed.data.conversationId,
              name: leadData.name ?? null,
              email: leadData.email ?? null,
              phone: leadData.phone ?? null,
              status: "NEW",
              source: "CHAT",
            },
          });
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
