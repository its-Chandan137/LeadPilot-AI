import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient, getDatabaseUrl } from "@/lib/prisma";

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  if (!getDatabaseUrl()) {
    return null;
  }

  const prisma = getSharedPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });

  return membership?.workspaceId ?? null;
}

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: { name?: unknown } | null;
};

export async function ensureUserWorkspace(user: AuthUser): Promise<string | null> {
  if (!getDatabaseUrl() || !user?.id) {
    return null;
  }

  const prisma = getSharedPrismaClient();

  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });

  if (existing) {
    return existing.workspaceId;
  }

  const metadataName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  const name = metadataName ?? user.email?.split("@")[0] ?? "LeadPilot";
  const workspaceName = `${name}'s Workspace`;

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email ?? "",
      name,
    },
    create: {
      id: user.id,
      email: user.email ?? "",
      name,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
    select: { id: true },
  });

  return workspace.id;
}
