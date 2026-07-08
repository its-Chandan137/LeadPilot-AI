"use client";

import { Copy } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(value)}
      className="p-1 text-slate-400 hover:text-[#7C3AED] transition-colors"
      title="Copy Client ID"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
}
