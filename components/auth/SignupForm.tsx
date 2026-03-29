"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setInfo(
          "Account created! If email confirmation is enabled, check your inbox to finish signing in.",
        );
        return;
      }

      setInfo("You're in. Redirecting...");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {info ? (
        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/80 px-3.5 py-2.5 text-sm font-semibold text-violet-950">
          {info}
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
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        hint="Pick something strong (8+ characters)."
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink/60">
        Already blooming?{" "}
        <Link className="font-semibold text-fuchsia-700 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
