import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  widgetConfig: z.object({
    botName: z.string().trim().optional(),
    color: z.string().trim().optional(),
    welcomeMessage: z.string().trim().optional(),
    mode: z.enum(["chat", "voice", "both"]).optional(),
    template: z.string().trim().optional(),
    provider: z.enum(["groq", "livekit-openai", "sarvam"]).optional(),
    brand: z.any().optional(),
    objective: z.enum(["lead-generation", "customer-support", "general-information"]).optional(),
    questions: z.array(z.string()).optional(),
    objectives: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          objective: z.string(),
          enabled: z.boolean(),
          priority: z.number()
        })
      )
      .optional(),
    showBranding: z.boolean().optional(),
    fontFamily: z.string().optional(),
    headerTitle: z.string().optional(),
    headerSubtitle: z.string().optional(),
    avatarUrl: z.string().optional(),
    traffic: z
      .object({
        blockedReferrers: z.array(z.string()).optional(),
        blockedPaths: z.array(z.string()).optional()
      })
      .optional()
  }).optional(),
});

const settingsBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  siteUrl: z.string().trim().optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) return fail("You must be signed in.", 401);

    const prisma = getSharedPrismaClient();
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true }
    });
    if (!membership) return fail("Workspace not found.", 404);

    const project = await prisma.project.findFirst({
      where: { id: params.id, workspaceId: membership.workspaceId },
      select: { id: true, name: true, widgetConfig: true }
    });
    if (!project) return fail("Project not found.", 404);

    return ok({ project });
  } catch (error) {
    logger.error(error);
    return fail("Unable to fetch project settings", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) return fail("You must be signed in.", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid settings payload");

    const prisma = getSharedPrismaClient();
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true }
    });
    if (!membership) return fail("Workspace not found.", 404);

    const project = await prisma.project.findFirst({
      where: { id: params.id, workspaceId: membership.workspaceId },
      select: { id: true, widgetConfig: true }
    });
    if (!project) return fail("Project not found.", 404);

    const existing = (project.widgetConfig ?? {}) as Record<string, unknown>;
    const updates = parsed.data.widgetConfig ?? {};

    const newWidgetConfig = { ...existing };
    if (updates.botName !== undefined) newWidgetConfig.botName = updates.botName;
    if (updates.color !== undefined) newWidgetConfig.color = updates.color;
    if (updates.welcomeMessage !== undefined) newWidgetConfig.welcomeMessage = updates.welcomeMessage;
    if (updates.mode !== undefined) newWidgetConfig.mode = updates.mode;
    if (updates.template !== undefined) newWidgetConfig.template = updates.template;
    if (updates.provider !== undefined) newWidgetConfig.provider = updates.provider;
    else newWidgetConfig.provider = newWidgetConfig.provider ?? "groq";
    if (updates.brand !== undefined) newWidgetConfig.brand = updates.brand;
    if (updates.objective !== undefined) newWidgetConfig.objective = updates.objective;
    if (updates.questions !== undefined) newWidgetConfig.questions = updates.questions;
    if (updates.objectives !== undefined) newWidgetConfig.objectives = updates.objectives;
    if (updates.showBranding !== undefined) newWidgetConfig.showBranding = updates.showBranding;
    if (updates.fontFamily !== undefined) newWidgetConfig.fontFamily = updates.fontFamily;
    if (updates.headerTitle !== undefined) newWidgetConfig.headerTitle = updates.headerTitle;
    if (updates.headerSubtitle !== undefined) newWidgetConfig.headerSubtitle = updates.headerSubtitle;
    if (updates.avatarUrl !== undefined) newWidgetConfig.avatarUrl = updates.avatarUrl;
    if (updates.traffic !== undefined) {
      newWidgetConfig.traffic = {
        ...(existing.traffic as Record<string, unknown> | undefined),
        ...(updates.traffic as Record<string, unknown>)
      };
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { widgetConfig: newWidgetConfig as any }
    });

    return ok({ project: { id: updated.id, widgetConfig: newWidgetConfig } });
  } catch (error) {
    logger.error(error);
    return fail("Unable to update settings", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) return fail("You must be signed in.", 401);

    const parsed = settingsBodySchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid settings payload");

    const prisma = getSharedPrismaClient();
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    if (!membership) return fail("Workspace not found.", 404);

    const project = await prisma.project.findFirst({
      where: { id: params.id, workspaceId: membership.workspaceId },
      select: { id: true },
    });
    if (!project) return fail("Project not found.", 404);

    const data: Record<string, string> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.siteUrl !== undefined) data.siteUrl = parsed.data.siteUrl;

    const updated = await prisma.project.update({
      where: { id: project.id },
      data,
      select: { id: true, name: true, siteUrl: true },
    });

    return ok({ project: updated });
  } catch (error) {
    logger.error(error);
    return fail("Unable to update project settings", 500);
  }
}
