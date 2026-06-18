export default function WidgetCustomizationPage() {
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[420px_1fr]">
      <section>
        <h1 className="text-3xl font-semibold">Widget customization</h1>
        <p className="mt-2 text-slate-600">Phase 1 config fields are color, bot name, and welcome message.</p>
        <form className="mt-8 space-y-4 rounded-lg border bg-white p-6">
          <label className="block text-sm font-medium">
            Brand color
            <input className="mt-2 h-10 w-full rounded-md border px-3" defaultValue="#2563eb" />
          </label>
          <label className="block text-sm font-medium">
            Bot name
            <input className="mt-2 w-full rounded-md border px-3 py-2" defaultValue="Ava" />
          </label>
          <label className="block text-sm font-medium">
            Welcome message
            <textarea className="mt-2 min-h-24 w-full rounded-md border px-3 py-2" defaultValue="Hi! I can help you choose the right service." />
          </label>
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white" type="button">Save config</button>
        </form>
      </section>
      <section className="min-h-[620px] rounded-lg border bg-white p-4">
        <iframe
          className="h-full min-h-[590px] w-full rounded-md border"
          src="/widget-preview.html"
          title="Widget preview"
        />
      </section>
    </main>
  );
}
