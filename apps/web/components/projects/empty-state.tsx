import { FolderKanban } from "lucide-react";
import Link from "next/link";

export function EmptyState() {
  return (
    <section className="mt-12 rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
        <FolderKanban className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-[#111827]">No projects yet</h2>
      <p className="mt-2 text-sm text-[#6B7280]">Create your first project to get started</p>
      <Link className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[#7C3AED] px-4 text-sm font-semibold text-white transition hover:bg-[#5B21B6]" href="/projects/new">
        Create Project
      </Link>
    </section>
  );
}
