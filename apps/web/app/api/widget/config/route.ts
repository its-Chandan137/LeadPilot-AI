import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { findProjectByClientId, toWidgetConfig } from "@/lib/widget-store";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  clientId: z.string().min(1)
});

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
      return fail("Project not found", 404);
    }

    return ok({ config: toWidgetConfig(project) });
  } catch (error) {
    logger.error(error);
    return fail("Unable to load widget config", 500);
  }
}
