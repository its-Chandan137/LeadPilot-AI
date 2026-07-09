import Link from "next/link";
import { HomeLayout } from "@/components/layout";
import { listProjects, toWidgetConfig } from "@/lib/widget-store";
import { Plus, ArrowRight, FolderOpen, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <HomeLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Projects</h1>
          <p className="mt-1 text-slate-600">Manage your AI widget projects</p>
        </div>
        <Link className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 transition-colors flex items-center gap-1.5" href="/projects/new">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 px-4">
          <FolderOpen className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-lg font-semibold text-slate-900">No projects yet</p>
          <p className="mt-1 text-sm text-slate-500 mb-6">Create your first project to get started</p>
          <Link className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 transition-colors" href="/projects/new">
            Create Project
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {projects.map((project) => {
            const config = toWidgetConfig(project);
            return (
              <div key={project.id} className="relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-violet-200 transition-all">
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-violet-600 rounded-l-xl" />
                <div className="flex items-start justify-between gap-4 p-5 pl-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900 truncate">{project.name}</h2>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      {project.siteUrl ? (
                        <span className="truncate">{project.siteUrl}</span>
                      ) : (
                        <span className="text-slate-400">No site URL set</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">{project.clientId}</code>
                      <span className="text-sm text-slate-500">Bot: {config.botName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 transition-colors flex items-center gap-1.5" href={`/projects/${project.id}/overview`}>
                      Open Project
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </HomeLayout>
  );
}
