import { NextResponse } from "next/server";
import { z } from "zod";
import { getSharedPrismaClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional()
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json({ success: false, error: "You must be signed in to create a workspace." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());

  const metadataName = typeof user.user_metadata.name === "string" ? user.user_metadata.name : null;
  const fallbackName = user.email.split("@")[0] ?? "LeadPilot";
  const name = parsed.success ? parsed.data.name ?? metadataName ?? fallbackName : metadataName ?? fallbackName;

  const prisma = getSharedPrismaClient();
  const workspaceName = `${name}'s Workspace`;

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email ?? "",
        name
      },
      create: {
        id: user.id,
        email: user.email ?? "",
        name
      }
    });

    const existingMembership = await tx.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { id: true }
    });

    if (existingMembership) {
      return;
    }

    await tx.workspace.create({
      data: {
        name: workspaceName,
        members: {
          create: {
            userId: user.id,
            role: "OWNER"
          }
        }
      }
    });
  });

  return NextResponse.json({ success: true });
}
