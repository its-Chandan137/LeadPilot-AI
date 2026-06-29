import { listProjects } from "@/lib/widget-store";

export default async function SnippetPage({ params }: { params: { id: string } }) {
  const projects = await listProjects();
  const project = projects.find((p) => p.id === params.id || p.clientId === params.id);

  const clientId = project?.clientId ?? "demo-client-id";
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://leadpilot-ai-beryl.vercel.app";

  const snippets = [
    [
      "HTML",
      `<script\n  async\n  src="${apiUrl}/widget.js"\n  data-client-id="${clientId}"\n  data-api-url="${apiUrl}"\n  data-widget-src="${apiUrl}/widget-dist/widget.js"\n></script>`
    ],
    [
      "React",
      `useEffect(() => {\n  const s = document.createElement('script')\n  s.src = '${apiUrl}/widget.js'\n  s.async = true\n  s.dataset.clientId = '${clientId}'\n  s.dataset.apiUrl = '${apiUrl}'\n  s.dataset.widgetSrc = '${apiUrl}/widget-dist/widget.js'\n  document.body.appendChild(s)\n  return () => document.body.removeChild(s)\n}, [])`
    ],
    [
      "Angular",
      `ngOnInit() {\n  const s = document.createElement('script')\n  s.src = '${apiUrl}/widget.js'\n  s.async = true\n  s.dataset.clientId = '${clientId}'\n  s.dataset.apiUrl = '${apiUrl}'\n  s.dataset.widgetSrc = '${apiUrl}/widget-dist/widget.js'\n  document.body.appendChild(s)\n}`
    ],
    [
      "Vue",
      `onMounted(() => {\n  const s = document.createElement('script')\n  s.src = '${apiUrl}/widget.js'\n  s.async = true\n  s.dataset.clientId = '${clientId}'\n  s.dataset.apiUrl = '${apiUrl}'\n  s.dataset.widgetSrc = '${apiUrl}/widget-dist/widget.js'\n  document.body.appendChild(s)\n})`
    ],
    [
      "Next.js",
      `<Script\n  async\n  src="${apiUrl}/widget.js"\n  data-client-id="${clientId}"\n  data-api-url="${apiUrl}"\n  data-widget-src="${apiUrl}/widget-dist/widget.js"\n/>`
    ],
    [
      "Google Tag Manager",
      `Create a Custom HTML tag with the HTML snippet, trigger it on All Pages, then publish the container.`
    ]
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Install widget</h1>
      <p className="mt-2 text-slate-600">Use the snippet that matches your site. Each one points at <code>{clientId}</code>.</p>
      <div className="mt-8 grid gap-4">
        {snippets.map(([label, snippet]) => (
          <section className="rounded-lg border bg-white p-5" key={label}>
            <h2 className="font-semibold">{label}</h2>
            <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50"><code>{snippet}</code></pre>
          </section>
        ))}
      </div>
    </main>
  );
}
