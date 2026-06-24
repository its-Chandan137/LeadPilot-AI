"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@/components/snippet/code-block";

type SnippetTabsProps = {
  appUrl: string;
  clientId: string;
};

export function SnippetTabs({ appUrl, clientId }: SnippetTabsProps) {
  const [activeTab, setActiveTab] = useState("HTML");
  const snippets = useMemo(
    () => ({
      HTML: `<script
  async
  src="${appUrl}/cdn/widget.js"
  data-client-id="${clientId}"
  data-api-url="${appUrl}"
  data-widget-src="${appUrl}/widget-dist/widget.js">
</script>`,
      "React / Next.js": `useEffect(() => {
  const script = document.createElement('script')
  script.src = '${appUrl}/cdn/widget.js'
  script.async = true
  script.setAttribute('data-client-id', '${clientId}')
  script.setAttribute('data-api-url', '${appUrl}')
  script.setAttribute('data-widget-src', '${appUrl}/widget-dist/widget.js')
  document.body.appendChild(script)
}, [])`,
      Vue: `onMounted(() => {
  const script = document.createElement('script')
  script.src = '${appUrl}/cdn/widget.js'
  script.async = true
  script.setAttribute('data-client-id', '${clientId}')
  script.setAttribute('data-api-url', '${appUrl}')
  script.setAttribute('data-widget-src', '${appUrl}/widget-dist/widget.js')
  document.body.appendChild(script)
})`
    }),
    [appUrl, clientId]
  );

  const tabs = Object.keys(snippets);
  const code = snippets[activeTab as keyof typeof snippets];

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-[#E5E7EB]">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            className={
              activeTab === tab
                ? "rounded-lg bg-[#EDE9FE] px-4 py-2 text-sm font-semibold text-[#7C3AED]"
                : "rounded-lg px-4 py-2 text-sm font-semibold text-[#6B7280] hover:bg-[#F9FAFB]"
            }
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <CodeBlock code={code} />
      </div>
    </section>
  );
}
