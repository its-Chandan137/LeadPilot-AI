import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_520px]">
      <section className="hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="text-lg font-semibold">LeadPilot AI</div>
          <div className="mt-20 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Workspace command center</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight">
              Turn every website conversation into a trackable lead.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Create your workspace, install the widget, and manage projects from one clean dashboard.
            </p>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-slate-300">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">Secure Supabase authentication</div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">Workspace-based project ownership</div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">Ready for chat, leads, and reporting</div>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10">{children}</section>
    </main>
  );
}
