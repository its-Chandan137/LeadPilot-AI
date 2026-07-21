import { getSharedPrismaClient } from "@/lib/prisma";
import { getTrafficAnalytics } from "@/lib/traffic-analytics";
import type { TrafficConfig } from "@/lib/traffic-block";
import { WidgetSettingsClient } from "./widget-settings-client";

export const dynamic = "force-dynamic";

export default async function WidgetSettingsPage({ params }: { params: { id: string } }) {
  const prisma = getSharedPrismaClient();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, clientId: true, widgetConfig: true },
  });

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const widgetConfig = (project?.widgetConfig as Record<string, unknown>) ?? {};
  const trafficConfig = (widgetConfig.traffic ?? {}) as TrafficConfig;
  const blockedReferrers = Array.isArray(trafficConfig.blockedReferrers)
    ? (trafficConfig.blockedReferrers as string[])
    : [];

  const analytics = project
    ? await getTrafficAnalytics(project.id, blockedReferrers)
    : null;

  return (
    <WidgetSettingsClient
      projectId={params.id}
      projectName={project?.name ?? "Project"}
      clientId={project?.clientId ?? ""}
      widgetConfig={widgetConfig}
      apiUrl={apiUrl}
      analytics={analytics}
      trafficConfig={trafficConfig}
    />
  );
}
