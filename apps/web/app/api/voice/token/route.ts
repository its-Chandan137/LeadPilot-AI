import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { getSharedPrismaClient } from "@/lib/prisma";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { isOriginAllowed } from "@/lib/validate-origin";

const bodySchema = z.object({
  clientId: z.string().min(1),
  visitorId: z.string().min(1),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid payload");
    }

    const { clientId, visitorId } = parsed.data;
    const prisma = getSharedPrismaClient();

    const project = await prisma.project.findUnique({
      where: { clientId },
      select: { id: true, siteUrl: true },
    });

    if (!project) {
      return fail("Project not found", 404);
    }

    // Domain lock: only allow the widget to start voice from the project's configured site.
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    if (!isOriginAllowed(origin, referer, project.siteUrl)) {
      console.warn(
        `[Voice] Token rejected: origin="${origin}" referer="${referer}" not allowed for siteUrl="${project.siteUrl}"`
      );
      return fail("Voice is not authorized for this domain", 403);
    }

    const roomName = `voice-${project.id}-${visitorId}-${Date.now()}`;

    const voiceConversation = await prisma.voiceConversation.create({
      data: {
        projectId: project.id,
        visitorId,
        roomName,
        status: "active",
      },
      select: { id: true },
    });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return fail("Server misconfigured", 500);
    }

    const token = new AccessToken(apiKey, apiSecret, {
      ttl: "10m",
      identity: visitorId,
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    console.log(typeof jwt, jwt.substring(0, 20));

    try {
      const dispatchClient = new AgentDispatchClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!
      );
      await dispatchClient.createDispatch(roomName, "leadpilot-agent", {
        metadata: JSON.stringify({
          projectId: project.id,
          visitorId,
          voiceConversationId: voiceConversation.id,
        }),
      });
      console.log(`[Voice] Dispatched agent "leadpilot-agent" to room: ${roomName}`);
    } catch (dispatchErr) {
      console.error(
        `[Voice] CRITICAL: Failed to dispatch agent "leadpilot-agent" to room ${roomName}. ` +
          `The visitor would connect to an empty room with no assistant. ` +
          `Verify LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET and that the agent worker is running.`,
        dispatchErr
      );
      return fail("Unable to start voice agent. Please try again later.", 500);
    }

    return ok({
      token: jwt,
      roomName,
      voiceConversationId: voiceConversation.id,
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to create token", 500);
  }
}
