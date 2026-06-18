import Link from "next/link";
import { listProjects, toWidgetConfig } from "@/lib/widget-store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Projects</h1>
          <p className="mt-1 text-slate-600">Manage widget installs and project snippets.</p>
        </div>
        <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white" href="/projects/new">New project</Link>
      </div>
      <div className="mt-8 overflow-hidden rounded-lg border bg-white">
        {projects.map((project) => {
          const config = toWidgetConfig(project);
          return (
            <div className="grid gap-4 border-b p-5 last:border-b-0 md:grid-cols-[1fr_auto]" key={project.id}>
              <div>
                <h2 className="font-semibold">{project.name}</h2>
                <p className="mt-1 text-sm text-slate-600">Client ID: {project.clientId}</p>
                <p className="mt-1 text-sm text-slate-600">Bot: {config.botName}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-md border px-3 py-2 text-sm" href={`/projects/${project.id}/widget`}>Customize</Link>
                <Link className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white" href={`/projects/${project.id}/snippet`}>Snippet</Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
