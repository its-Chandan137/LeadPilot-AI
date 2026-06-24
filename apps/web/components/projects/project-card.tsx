import { Calendar, LinkIcon } from "lucide-react";
import Link from "next/link";

export function ProjectCard({
  project
}: {
  project: {
    id: string;
    name: string;
    siteUrl: string;
    clientId: string;
    createdAt: Date;
  };
}) {
  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-[#111827]">{project.name}</h2>
      <a className="mt-3 flex items-center gap-2 break-all text-sm text-[#6B7280]" href={project.siteUrl} rel="noreferrer" target="_blank">
        <LinkIcon className="h-4 w-4 flex-none" />
        {project.siteUrl}
      </a>
      <div className="mt-4 rounded-lg bg-[#EDE9FE] px-3 py-2 font-mono text-xs font-semibold text-[#5B21B6]">{project.clientId}</div>
      <p className="mt-4 flex items-center gap-2 text-sm text-[#6B7280]">
        <Calendar className="h-4 w-4" />
        {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(project.createdAt)}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5B21B6]" href={`/projects/${project.id}/snippet`}>
          View Snippet
        </Link>
        <Link className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]" href={`/projects/${project.id}`}>
          Settings
        </Link>
      </div>
    </article>
  );
}
