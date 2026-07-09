"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
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

      router.push(`/projects/${data.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Create project</h1>
      <p className="mt-2 text-slate-600">
        The Phase 1 demo project is seeded as <code>demo-client-id</code>.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border bg-white p-6">
        <label className="block text-sm font-medium">
          Project name
          <input
            className="mt-2 w-full rounded-md border px-3 py-2"
            placeholder="Acme Services"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Site URL
          <input
            className="mt-2 w-full rounded-md border px-3 py-2"
            placeholder="https://example.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </form>
    </main>
  );
}
