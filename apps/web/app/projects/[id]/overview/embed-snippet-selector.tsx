"use client";

import { useState } from "react";
import { CopySnippet } from "@/components/ui/copy-snippet";

type Platform = {
  label: string;
  snippet: string;
};

export function EmbedSnippetSelector({ clientId, apiUrl }: { clientId: string; apiUrl: string }) {
  const [selected, setSelected] = useState(0);

  const platforms: Platform[] = [
    {
      label: "HTML",
      snippet: `<script\n  async\n  src="${apiUrl}/widget.js"\n  data-client-id="${clientId}"\n  data-api-url="${apiUrl}"\n  data-widget-src="${apiUrl}/widget-dist/widget.js"\n></script>`,
    },
    {
      label: "React",
      snippet: `useEffect(() => {\n  const s = document.createElement('script')\n  s.src = '${apiUrl}/widget.js'\n  s.async = true\n  s.dataset.clientId = '${clientId}'\n  s.dataset.apiUrl = '${apiUrl}'\n  s.dataset.widgetSrc = '${apiUrl}/widget-dist/widget.js'\n  document.body.appendChild(s)\n  return () => document.body.removeChild(s)\n}, [])`,
    },
    {
      label: "Next.js",
      snippet: `<Script\n  async\n  src="${apiUrl}/widget.js"\n  data-client-id="${clientId}"\n  data-api-url="${apiUrl}"\n  data-widget-src="${apiUrl}/widget-dist/widget.js"\n/>`,
    },
    {
      label: "Vue",
      snippet: `onMounted(() => {\n  const s = document.createElement('script')\n  s.src = '${apiUrl}/widget.js'\n  s.async = true\n  s.dataset.clientId = '${clientId}'\n  s.dataset.apiUrl = '${apiUrl}'\n  s.dataset.widgetSrc = '${apiUrl}/widget-dist/widget.js'\n  document.body.appendChild(s)\n})`,
    },
    {
      label: "Angular",
      snippet: `ngOnInit() {\n  const s = document.createElement('script')\n  s.src = '${apiUrl}/widget.js'\n  s.async = true\n  s.dataset.clientId = '${clientId}'\n  s.dataset.apiUrl = '${apiUrl}'\n  s.dataset.widgetSrc = '${apiUrl}/widget-dist/widget.js'\n  document.body.appendChild(s)\n}`,
    },
  ];

  const current = platforms[selected];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {platforms.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setSelected(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selected === i
                ? "bg-[#7C3AED] text-white"
                : "bg-[#F5F3FF] text-[#6B7280] hover:bg-[#EDE9FE] hover:text-[#7C3AED]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
          <code>{current.snippet}</code>
        </pre>
        <CopySnippet code={current.snippet} />
      </div>
    </div>
  );
}
