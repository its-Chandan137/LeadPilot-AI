import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { findProjectByClientId, toWidgetConfig } from "@/lib/widget-store";
import { isOriginAllowed } from "@/lib/validate-origin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  clientId: z.string().min(1)
});

const demoConfig = {
  clientId: "demo-client-id",
  projectName: "Acme Services",
  color: "#2563eb",
  botName: "Ava",
  welcomeMessage: "Hi! I can help you choose the right service.",
  mode: "chat",
  provider: "groq",
  livekitUrl: process.env.LIVEKIT_URL ?? "wss://your-app.livekit.cloud"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      clientId: url.searchParams.get("clientId")
    });

    if (!parsed.success) {
      return fail("Missing clientId");
    }

    const project = await findProjectByClientId(parsed.data.clientId);

    if (!project) {
      const livekitUrl = process.env.LIVEKIT_URL;
      if (!livekitUrl) {
        return fail("Server misconfigured: LIVEKIT_URL is missing", 500);
      }
      return ok({
        config: {
          ...demoConfig,
          clientId: parsed.data.clientId,
          livekitUrl
        }
      });
    }

    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    if (!isOriginAllowed(origin, referer, project.siteUrl)) {
      return fail("Widget is not authorized for this domain", 403);
    }

    const config = toWidgetConfig(project);

    if (!config.livekitUrl) {
      return fail("Server misconfigured: LIVEKIT_URL is missing", 500);
    }

    return ok({ config });
  } catch (error) {
    logger.error(error);
    return fail("Unable to load widget config", 500);
  }
}
