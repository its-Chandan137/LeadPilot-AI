import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { findProjectByClientId, toWidgetConfig } from "@/lib/widget-store";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  clientId: z.string().min(1)
});

const demoConfig = {
  clientId: "demo-client-id",
  projectName: "Acme Services",
  color: "#2563eb",
  botName: "Ava",
  welcomeMessage: "Hi! I can help you choose the right service.",
  mode: "chat"
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
      return ok({ config: { ...demoConfig, clientId: parsed.data.clientId } });
    }

    return ok({ config: toWidgetConfig(project) });
  } catch (error) {
    logger.error(error);
    return fail("Unable to load widget config", 500);
  }
}
