"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export function JoinClient({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function accept() {
    const t = token.trim();
    if (!t) {
      setError("Paste the invite token or use the full invite link.");
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
      <PageHeader title="Join household" description="Accept a family invite with the link your admin shared." />

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
        <p className="text-sm text-ink/60">
          Sign in with the same email the invite was sent to, then confirm below.
        </p>
        <label htmlFor="joinToken" className="mt-4 mb-1.5 block text-xs font-semibold text-ink/70">
          Invite token
        </label>
        <input
          id="joinToken"
          className="w-full rounded-2xl border border-rose-100/90 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60"
          placeholder="From the invite link (?token=…)"
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
      </Card>
    </div>
  );
}
