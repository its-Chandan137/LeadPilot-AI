"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopySnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
      title="Copy snippet"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
      )}
    </button>
  );
}
