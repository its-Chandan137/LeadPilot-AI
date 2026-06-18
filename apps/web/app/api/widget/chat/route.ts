import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { saveChatTurn } from "@/lib/widget-store";
import { logger } from "@/lib/logger";

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

  // TODO: Replace with RAG-based AI response using OpenAI + pgvector.
  return hardcodedReplies[matchedKey ?? "default"];
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

    const reply = getHardcodedReply(parsed.data.message);
    const saved = await saveChatTurn({
      clientId: parsed.data.clientId,
      visitorId: parsed.data.visitorId,
      conversationId: parsed.data.conversationId,
      message: parsed.data.message,
      reply
    });

    if (!saved) {
      return fail("Conversation not found", 404);
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
