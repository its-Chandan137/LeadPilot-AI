import { getSharedPrismaClient } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: { id: string } }) {
  const prisma = getSharedPrismaClient();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, siteUrl: true },
  });

  if (!project) return notFound();

  return <SettingsClient project={project} />;
}
