"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Users, MessageSquare, X } from "lucide-react";
import type { SearchResult } from "@/lib/crm";

export function GlobalSearch({ projectId }: { projectId?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ q: query });
    if (projectId) params.set("projectId", projectId);
    fetch(`/api/crm/search?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((json) => json.success && setResults(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [query, projectId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const total = (results?.leads.length ?? 0) + (results?.conversations.length ?? 0);

  return (
    <div className="relative w-full max-w-md" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search leads, companies, pain points, goals…"
          className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm outline-none focus:border-[#7C3AED]"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-96 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-slate-400">Searching…</p>}
          {!loading && total === 0 && (
            <p className="p-4 text-sm text-slate-400">No matches across intelligence.</p>
          )}
          {results && results.leads.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Leads</p>
              {results.leads.slice(0, 6).map((l) => (
                <Link
                  key={l.id}
                  href="/leads"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50"
                >
                  <Users className="w-4 h-4 text-[#7C3AED]" />
                  <span className="text-sm text-slate-700 truncate">
                    {l.name ?? `Visitor ${l.visitorId.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto truncate max-w-[40%]">{l.project.name}</span>
                </Link>
              ))}
            </div>
          )}
          {results && results.conversations.length > 0 && (
            <div className="p-2 border-t">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Conversations</p>
              {results.conversations.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  href={`/projects/${c.projectId}/conversations`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50"
                >
                  <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                  <span className="text-sm text-slate-700 truncate">
                    {c.lead?.name ?? `Visitor ${c.visitorId.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto truncate max-w-[40%]">{c.project.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
