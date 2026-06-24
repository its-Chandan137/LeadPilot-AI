"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProjectResponse = {
  success: boolean;
  data?: {
    project: {
      id: string;
    };
  };
  error?: string;
};

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !siteUrl.trim()) {
      setError("Project name and site URL are required.");
      return;
    }

    try {
      new URL(siteUrl);
    } catch {
      setError("Enter a valid site URL.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, siteUrl })
      });
      const payload = (await response.json()) as ProjectResponse;

      if (!payload.success || !payload.data?.project.id) {
        setError(payload.error ?? "Could not create project.");
        return;
      }

      router.push(`/projects/${payload.data.project.id}/snippet`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Project Name</Label>
        <Input id="name" onChange={(event) => setName(event.target.value)} placeholder="Acme Corp" required value={name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="siteUrl">Site URL</Label>
        <Input id="siteUrl" onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://acme.com" required type="url" value={siteUrl} />
      </div>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#EF4444]">{error}</p> : null}
      <Button className="h-11 w-full rounded-lg bg-[#7C3AED] font-semibold hover:bg-[#5B21B6]" disabled={isLoading} type="submit">
        {isLoading ? "Creating Project..." : "Create Project"}
      </Button>
    </form>
  );
}
