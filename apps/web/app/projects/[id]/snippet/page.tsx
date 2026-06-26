const clientId = "demo-client-id";

const snippets = [
  ["HTML", `<script async src="http://localhost:3000/widget.js" data-client-id="${clientId}" data-api-url="http://localhost:3000" data-widget-src="http://localhost:5174/widget.js"></script>`],
  ["React", `useEffect(() => {\n  const script = document.createElement("script");\n  script.async = true;\n  script.src = "http://localhost:3000/widget.js";\n  script.dataset.clientId = "${clientId}";\n  script.dataset.apiUrl = "http://localhost:3000";\n  script.dataset.widgetSrc = "http://localhost:5174/widget.js";\n  document.body.appendChild(script);\n  return () => script.remove();\n}, []);`],
  ["Angular", `ngOnInit() {\n  const script = document.createElement("script");\n  script.async = true;\n  script.src = "http://localhost:3000/widget.js";\n  script.dataset.clientId = "${clientId}";\n  script.dataset.apiUrl = "http://localhost:3000";\n  script.dataset.widgetSrc = "http://localhost:5174/widget.js";\n  document.body.appendChild(script);\n}`],
  ["Vue", `onMounted(() => {\n  const script = document.createElement("script");\n  script.async = true;\n  script.src = "http://localhost:3000/widget.js";\n  script.dataset.clientId = "${clientId}";\n  script.dataset.apiUrl = "http://localhost:3000";\n  script.dataset.widgetSrc = "http://localhost:5174/widget.js";\n  document.body.appendChild(script);\n});`],
  ["Next.js", `<Script async src="http://localhost:3000/widget.js" data-client-id="${clientId}" data-api-url="http://localhost:3000" data-widget-src="http://localhost:5174/widget.js" />`],
  ["Google Tag Manager", `Create a Custom HTML tag with the HTML snippet, trigger it on All Pages, then publish the container.`]
];

export default function SnippetPage() {
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
