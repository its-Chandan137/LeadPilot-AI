"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type BootstrapResponse = {
  success: boolean;
  error?: string;
};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const payload = (await response.json()) as BootstrapResponse;

      if (!payload.success) {
        setError(payload.error ?? "Could not load your workspace.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to manage your workspace and projects.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </div>
          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <Button className="w-full" disabled={isLoading} type="submit">
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New to LeadPilot?{" "}
          <Link className="font-medium text-blue-700" href="/signup">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
