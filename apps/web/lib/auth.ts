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
