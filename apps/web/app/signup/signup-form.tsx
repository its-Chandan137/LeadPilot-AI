"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type BootstrapResponse = {
  success: boolean;
  error?: string;
};

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: redirectTo
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setError("Check your email to confirm your account, then log in to finish workspace setup.");
        return;
      }

      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const payload = (await response.json()) as BootstrapResponse;

      if (!payload.success) {
        setError(payload.error ?? "Could not create your workspace.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-neutral-800 mb-1.5 block" htmlFor="name">
          Name
        </Label>
        <Input
          className="h-11 rounded-lg border-neutral-200 bg-neutral-50 placeholder:text-neutral-400"
          id="name"
          minLength={1}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-neutral-800 mb-1.5 block" htmlFor="email">
          Email
        </Label>
        <Input
          className="h-11 rounded-lg border-neutral-200 bg-neutral-50 placeholder:text-neutral-400"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-neutral-800 mb-1.5 block" htmlFor="password">
          Password
        </Label>
        <Input
          className="h-11 rounded-lg border-neutral-200 bg-neutral-50 placeholder:text-neutral-400"
          id="password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Button
        className="w-full h-11 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-sm font-medium"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
  );
}
