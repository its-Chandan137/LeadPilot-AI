export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Create project</h1>
      <p className="mt-2 text-slate-600">The Phase 1 demo project is seeded as <code>demo-client-id</code>.</p>
      <form className="mt-8 space-y-4 rounded-lg border bg-white p-6">
        <label className="block text-sm font-medium">
          Project name
          <input className="mt-2 w-full rounded-md border px-3 py-2" placeholder="Acme Services" />
        </label>
        <label className="block text-sm font-medium">
          Site URL
          <input className="mt-2 w-full rounded-md border px-3 py-2" placeholder="https://example.com" />
        </label>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white" type="button">Create project</button>
      </form>
    </main>
  );
}
