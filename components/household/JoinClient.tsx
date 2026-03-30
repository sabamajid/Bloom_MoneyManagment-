"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/client";

export function JoinClient({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const joinPath = token.trim()
    ? `/join?token=${encodeURIComponent(token.trim())}`
    : "/join";

  const refreshSession = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSignedIn(Boolean(session?.user));
    setSessionReady(true);
  }, []);

  useEffect(() => {
    void refreshSession();
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });
    return () => subscription.unsubscribe();
  }, [refreshSession]);

  async function accept() {
    const t = token.trim();
    if (!t) {
      setError("This page needs a token in the URL (?token=…). Ask your admin for a new link if it expired.");
      return;
    }
    if (!signedIn) {
      setError("Sign in first, then tap Join.");
      return;
    }
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch("/api/household/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const payload = (await res.json()) as { error?: string; alreadyMember?: boolean };
      if (!res.ok) {
        setError(payload.error ?? "Could not join.");
        return;
      }
      setInfo(payload.alreadyMember ? "You are already in this household." : "Welcome! Redirecting…");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Join household"
        description="Use the link your admin shared. Links work for 15 minutes — sign in with your own account, then join."
      />

      <Card variant="quiet" className="p-5 sm:p-6">
        {error ? (
          <p className="mb-4 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-sm font-medium text-rose-900">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="mb-4 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm font-medium text-emerald-900">
            {info}
          </p>
        ) : null}

        {!sessionReady ? (
          <p className="text-sm text-ink/60">Checking sign-in…</p>
        ) : !signedIn ? (
          <div className="space-y-4">
            <p className="text-sm text-ink/70">
              Sign in or create an account with the Google or email you want to use in this household. You will join as a
              guest (or with the access level the admin picked).
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/login?next=${encodeURIComponent(joinPath)}`}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Sign in to continue
              </Link>
              <Link
                href={`/signup?next=${encodeURIComponent(joinPath)}`}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-100/90 bg-white/80 px-4 py-2.5 text-sm font-semibold text-ink/85 hover:bg-white"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <>
            <label htmlFor="joinToken" className="mb-1.5 block text-xs font-semibold text-ink/70">
              Invite token (from your link)
            </label>
            <input
              id="joinToken"
              className="w-full rounded-2xl border border-rose-100/90 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60"
              placeholder="Filled automatically from ?token= in the URL"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void accept()}>
                {busy ? "…" : "Join household"}
              </Button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-ink/80 hover:bg-white/60"
              >
                Back to dashboard
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
