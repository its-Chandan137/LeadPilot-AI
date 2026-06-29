import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createConversation } from "@/lib/widget-store";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  clientId: z.string().min(1),
  visitorId: z.string().min(1)
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid conversation payload");
    }

    const conversationId = await createConversation(parsed.data.clientId, parsed.data.visitorId);

    if (!conversationId) {
      return ok({ conversationId: `demo-conv-${crypto.randomUUID()}` });
    }

    return ok({ conversationId });
  } catch (error) {
    logger.error(error);
    return fail("Unable to start conversation", 500);
  }
}
