import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSharedPrismaClient } from "@/lib/prisma";
import { ensureUserWorkspace } from "@/lib/auth";
import { HomeLayoutClient } from "./home-layout-client";

export async function HomeLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const prisma = getSharedPrismaClient();
  let membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: {
        select: { id: true, name: true }
      }
    }
  });

  if (!membership) {
    await ensureUserWorkspace(user);
    membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      }
    });
  }

  if (!membership) {
    redirect("/signup");
  }

  return (
    <HomeLayoutClient
      workspaceName={membership.workspace.name}
      userName={user.user_metadata?.name ?? user.email ?? "User"}
    >
      {children}
    </HomeLayoutClient>
  );
}
