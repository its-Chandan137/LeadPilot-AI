import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { findProjectByClientId, toWidgetConfig } from "@/lib/widget-store";
import { isOriginAllowed } from "@/lib/validate-origin";
import { normalizeReferrerDomain } from "@/lib/referrer";
import { isTrafficBlocked, type TrafficConfig } from "@/lib/traffic-block";
import { getSharedPrismaClient } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const REFERER_MAX = 500;
const PATH_MAX = 300;

const querySchema = z.object({
  clientId: z.string().min(1),
  ref: z.string().optional(),
  path: z.string().optional(),
  vid: z.string().optional(),
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
      clientId: url.searchParams.get("clientId"),
      ref: url.searchParams.get("ref") ?? undefined,
      path: url.searchParams.get("path") ?? undefined,
      vid: url.searchParams.get("vid") ?? undefined
    });

    if (!parsed.success) {
      return fail("Missing clientId");
    }

    const { clientId, ref, path, vid } = parsed.data;

    const project = await findProjectByClientId(clientId);

    if (!project) {
      const livekitUrl = process.env.LIVEKIT_URL;
      if (!livekitUrl) {
        return fail("Server misconfigured: LIVEKIT_URL is missing", 500);
      }
      return ok({
        config: {
          ...demoConfig,
          clientId,
          livekitUrl
        },
        blocked: false
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

    const referrerDomain = normalizeReferrerDomain(ref, project.siteUrl);

    const widgetConfig = (project.widgetConfig ?? {}) as Record<string, unknown>;
    const traffic = (widgetConfig.traffic ?? {}) as TrafficConfig;

    // Log the impression without blocking the response (KB-crawl pattern).
    // Captured even when the domain/path is blocked so the admin still sees
    // that traffic in the analytics tab.
    waitUntil(
      (async () => {
        try {
          const prisma = getSharedPrismaClient();
          await prisma.widgetTraffic.create({
            data: {
              projectId: project.id,
              visitorId: vid ?? null,
              referrer: ref ? ref.slice(0, REFERER_MAX) : null,
              referrerDomain,
              path: path ? path.slice(0, PATH_MAX) : null
            }
          });
        } catch (error) {
          logger.error(error);
        }
      })()
    );

    const isBlocked = isTrafficBlocked({ referrerDomain, path, traffic });

    return ok({ config, blocked: isBlocked });
  } catch (error) {
    logger.error(error);
    return fail("Unable to load widget config", 500);
  }
}
