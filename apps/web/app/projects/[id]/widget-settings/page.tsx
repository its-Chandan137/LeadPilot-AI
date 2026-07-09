import { getSharedPrismaClient } from "@/lib/prisma";
import { WidgetSettingsClient } from "./widget-settings-client";

export const dynamic = "force-dynamic";

export default async function WidgetSettingsPage({ params }: { params: { id: string } }) {
  const prisma = getSharedPrismaClient();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, clientId: true, widgetConfig: true },
  });

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <WidgetSettingsClient
      projectId={params.id}
      projectName={project?.name ?? "Project"}
      clientId={project?.clientId ?? ""}
      widgetConfig={(project?.widgetConfig as Record<string, unknown>) ?? {}}
      apiUrl={apiUrl}
    />
  );
}
