"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <button
        className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        onClick={copyCode}
        type="button"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-xl bg-[#1E1E1E] p-5 pt-16 text-sm leading-7 text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}
