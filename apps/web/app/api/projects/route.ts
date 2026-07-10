import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, fail, ok } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createProject } from "@/lib/widget-store";
import { ingestUrlForProject, extractBrandForProject } from "@/lib/knowledge-ingest";
import { waitUntil } from "@vercel/functions";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  siteUrl: z.string().trim().max(500).optional().default("")
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ success: false, error: "You must be signed in to create a project." }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid project payload");
    }

    const prisma = getSharedPrismaClient();

    let workspaceId = await prisma.workspaceMember
      .findFirst({
        where: { userId: user.id },
        select: { workspaceId: true }
      })
      .then((membership) => membership?.workspaceId)
      .catch((error) => {
        logger.error(error);
        return null;
      });

    if (!workspaceId) {
      const name = typeof user.user_metadata.name === "string" ? user.user_metadata.name : user.email?.split("@")[0] ?? "LeadPilot";

      await prisma.user.upsert({
        where: { id: user.id },
        update: { email: user.email ?? "", name },
        create: { id: user.id, email: user.email ?? "", name }
      });

      const workspace = await prisma.workspace.create({
        data: {
          name: `${name}'s Workspace`,
          members: {
            create: {
              userId: user.id,
              role: "OWNER"
            }
          }
        },
        select: { id: true }
      });
      workspaceId = workspace.id;
    }

    let siteUrl = parsed.data.siteUrl;

    if (siteUrl) {
      const trimmed = siteUrl.trim();
      const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      try {
        new URL(withProtocol);
        siteUrl = withProtocol;
      } catch {
        siteUrl = "";
      }
    }

    const project = await createProject({
      workspaceId,
      name: parsed.data.name,
      siteUrl
    });

    if (!project) {
      return fail("Unable to create project", 500);
    }

    if (siteUrl) {
      try {
        const name = new URL(siteUrl).hostname;
        const source = await prisma.knowledgeSource.create({
          data: {
            projectId: project.id,
            type: "URL",
            name,
            content: siteUrl,
            status: "PROCESSING"
          }
        });

        const job = ingestUrlForProject({
          projectId: project.id,
          sourceId: source.id,
          url: siteUrl,
          name
        });

        try {
          waitUntil(job);
        } catch {
          void job;
        }

        const brandJob = extractBrandForProject({
          projectId: project.id,
          url: siteUrl,
        });

        try {
          waitUntil(brandJob);
        } catch {
          void brandJob;
        }
      } catch {
        // Silently skip ingestion on any setup error
      }
    }

    return ok(project);
  } catch (error) {
    logger.error(error);
    return fail("Unable to create project", 500);
  }
}
