import { Suspense } from "react";
import { HomeLayout } from "@/components/layout";
import { listProjects, toWidgetConfig } from "@/lib/widget-store";
import { ProjectsPageClient } from "./projects-page-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { new?: string };
}) {
  const projects = await listProjects();
  const mapped = projects.map((p) => ({
    ...p,
    config: toWidgetConfig(p),
  }));

  return (
    <HomeLayout>
      <Suspense fallback={<div className="mt-8 text-center text-slate-500">Loading...</div>}>
        <ProjectsPageClient
          projects={mapped}
          defaultOpen={searchParams?.new === "1"}
        />
      </Suspense>
    </HomeLayout>
  );
}
