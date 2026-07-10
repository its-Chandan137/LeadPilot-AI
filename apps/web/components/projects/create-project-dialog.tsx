"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, siteUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        return;
      }

      onOpenChange(false);
      router.push(`/projects/${data.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <h2 className="text-xl font-semibold text-slate-900">Create project</h2>
        <p className="mt-1 text-sm text-slate-500">
          The Phase 1 demo project is seeded as <code className="rounded bg-slate-100 px-1 text-xs font-mono">demo-client-id</code>.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Project name
            <input
              className="mt-2 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              placeholder="Acme Services"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium">
            Website URL (optional)
            <input
              className="mt-2 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              placeholder="https://yourcompany.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
          </label>
          <p className="-mt-2 text-xs text-slate-500">We'll automatically train your AI on your website content.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
