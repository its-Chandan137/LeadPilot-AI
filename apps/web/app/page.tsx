import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto grid min-h-[92vh] max-w-6xl content-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">LeadPilot AI</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
            Convert website visitors from one install snippet.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Phase 1 ships the embeddable chat foundation: project config, a Shadow DOM widget,
            hardcoded replies, and stored conversations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href="/projects">View projects</Link>
            <Link className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium" href="/projects/demo/snippet">
              Install widget
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="rounded-md bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Ava</p>
                <p className="text-xs text-emerald-600">Online</p>
              </div>
              <span className="h-3 w-3 rounded-full bg-blue-600" />
            </div>
            <div className="space-y-3 py-5 text-sm">
              <p className="max-w-[80%] rounded-lg bg-slate-100 px-3 py-2">Hi! I can help you choose the right service.</p>
              <p className="ml-auto max-w-[80%] rounded-lg bg-blue-600 px-3 py-2 text-white">hello</p>
              <p className="max-w-[80%] rounded-lg bg-slate-100 px-3 py-2">Hi there! What can I do for you?</p>
            </div>
            <div className="rounded-md border px-3 py-2 text-sm text-slate-400">Type your message...</div>
          </div>
        </div>
      </section>
    </main>
  );
}
