import { HomeLayout } from "@/components/layout";
import { listProjects, toWidgetConfig } from "@/lib/widget-store";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { ProjectsPageClient } from "./projects-page-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { new?: string };
}) {
  const workspaceId = await getCurrentWorkspaceId();
  const projects = await listProjects(workspaceId);
  const mapped = projects.map((p) => ({
    ...p,
    config: toWidgetConfig(p),
  }));

  return (
    <HomeLayout>
      <ProjectsPageClient
        projects={mapped}
        defaultOpen={searchParams?.new === "1"}
      />
    </HomeLayout>
  );
}
