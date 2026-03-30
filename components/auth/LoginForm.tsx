"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  authCallbackFailed,
  nextPath = "/dashboard",
}: {
  authCallbackFailed?: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const friendlyAuthError = authCallbackFailed
    ? "Your sign-in link expired or was invalid. Please try again."
    : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {friendlyAuthError ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-2.5 text-sm font-semibold text-rose-900">
          {friendlyAuthError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-2.5 text-sm font-semibold text-rose-900">
          {error}
        </div>
      ) : null}

      <Input
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Input
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink/60">
        New here?{" "}
        <Link className="font-semibold text-fuchsia-700 hover:underline" href="/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
}
