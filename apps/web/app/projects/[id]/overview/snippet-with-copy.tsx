"use client";

import { CopySnippet } from "@/components/ui/copy-snippet";

export function SnippetWithCopy({ snippet }: { snippet: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
        <code>{snippet}</code>
      </pre>
      <CopySnippet code={snippet} />
    </div>
  );
}
