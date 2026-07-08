import { getSharedPrismaClient } from "@/lib/prisma";
import { ConversationsClient } from "./conversations-client";

export const dynamic = "force-dynamic";

export default async function ProjectConversationsPage({ params }: { params: { id: string } }) {
  const prisma = getSharedPrismaClient();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#111827]">Conversations</h1>
      <ConversationsClient projectId={params.id} projectName={project?.name ?? ""} />
    </div>
  );
}
