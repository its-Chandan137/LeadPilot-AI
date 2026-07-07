import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, ok, fail } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";

const querySchema = z.object({
  roomName: z.string().min(1),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ roomName: url.searchParams.get("roomName") });

    if (!parsed.success) {
      return fail("Missing roomName");
    }

    const prisma = getSharedPrismaClient();

    const conversation = await prisma.voiceConversation.findUnique({
      where: { roomName: parsed.data.roomName },
      select: {
        projectId: true,
        project: {
          select: {
            widgetConfig: true,
          },
        },
      },
    });

    if (!conversation) {
      return fail("Not found", 404);
    }

    const config = (conversation.project.widgetConfig as Record<string, unknown> | null) ?? null;

    return ok({
      projectId: conversation.projectId,
      botName: (config?.botName as string) ?? "Ava",
      systemPrompt: (config?.systemPrompt as string) ?? "You are a helpful assistant.",
      welcomeMessage: (config?.welcomeMessage as string) ?? "Hi! How can I help you today?",
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load agent config", 500);
  }
}
