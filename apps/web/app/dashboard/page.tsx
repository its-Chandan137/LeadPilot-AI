import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-slate-600">Phase 1 overview for the demo workspace.</p>
        </div>
        <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white" href="/projects">Projects</Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Projects", "1"],
          ["Conversations", "Stored via Prisma"],
          ["Widget status", "Connected"]
        ].map(([label, value]) => (
          <section className="rounded-lg border bg-white p-5" key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
