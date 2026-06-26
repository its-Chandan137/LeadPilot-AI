import Link from "next/link";

export default function ProjectDetailPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Acme Services</h1>
      <p className="mt-2 text-slate-600">Conversations, leads, and settings will expand after the Phase 1 widget pipe is stable.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-md border px-4 py-2 text-sm" href="/projects/demo/widget">Widget</Link>
        <Link className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white" href="/projects/demo/snippet">Snippet</Link>
      </div>
    </main>
  );
}
