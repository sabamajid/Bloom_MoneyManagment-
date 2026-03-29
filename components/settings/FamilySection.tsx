"use client";

import { Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { HouseholdInviteRow, HouseholdMemberRow, HouseholdRole } from "@/types/household";

type HouseholdGet = {
  error?: string;
  householdId?: string;
  role?: HouseholdRole;
  canInvite?: boolean;
  members?: HouseholdMemberRow[];
  invites?: HouseholdInviteRow[];
};

export function FamilySection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [data, setData] = useState<HouseholdGet | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState<"view" | "full">("view");
  const [inviteBusy, setInviteBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/household");
      const payload = (await res.json()) as HouseholdGet;
      if (!res.ok) {
        setError(payload.error ?? "Could not load household.");
        setData(null);
        return;
      }
      setData(payload);
    } catch {
      setError("Network error.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setError(null);
    setInfo(null);
    setInviteBusy(true);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, access: inviteAccess }),
      });
      const payload = (await res.json()) as { error?: string; invite?: { token?: string } };
      if (!res.ok) {
        setError(payload.error ?? "Could not send invite.");
        return;
      }
      setInviteEmail("");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const token = payload.invite?.token;
      setInfo(
        token
          ? `Invite created. Share this link with ${email}: ${origin}/join?token=${token}`
          : "Invite created.",
      );
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setInviteBusy(false);
    }
  }

  const roleLabel = (r: string) =>
    r === "admin" ? "Admin" : r === "full" ? "Full access" : "View only";

  return (
    <section id="family" className="scroll-mt-28 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Family</h2>
      <Card variant="quiet" className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-200/80">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Share expenses</p>
            <p className="mt-1 text-sm text-ink/55">
              Admins invite by email. View only can see the household activity; Full access can add and edit
              transactions (same 24-hour edit rules). Savings and cash accounts stay under Accounts, per person.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-sm font-medium text-rose-900">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm font-medium text-emerald-900">
            {info}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/50" />
        ) : data?.members?.length ? (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Members</p>
            <ul className="space-y-2">
              {data.members.map((m) => (
                <li
                  key={m.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100/80 bg-white/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">
                    {m.display_name?.trim() || `Member ${m.user_id.slice(0, 8)}…`}
                  </span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-ink/65 ring-1 ring-[var(--soft-ring)]">
                    {roleLabel(m.role)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data?.canInvite ? (
          <div className="mt-6 space-y-3 border-t border-rose-100/80 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Invite by email</p>
            <p className="text-xs text-ink/50">
              The person signs in (or signs up) with that email, then opens the link you share.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[14rem]">
                <Input
                  id="inviteEmail"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="min-w-0 sm:w-48">
                <label htmlFor="inviteAccess" className="mb-1.5 block text-xs font-semibold text-ink/70">
                  Permission
                </label>
                <select
                  id="inviteAccess"
                  className="w-full rounded-2xl border border-rose-100/90 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60"
                  value={inviteAccess}
                  onChange={(e) => setInviteAccess(e.target.value === "full" ? "full" : "view")}
                >
                  <option value="view">View only — see activity</option>
                  <option value="full">Full — add & edit (24h window)</option>
                </select>
              </div>
              <Button
                type="button"
                disabled={inviteBusy}
                className="w-full sm:w-auto"
                onClick={() => void sendInvite()}
              >
                {inviteBusy ? "…" : "Create invite link"}
              </Button>
            </div>
          </div>
        ) : data?.role && data.role !== "admin" ? (
          <p className="mt-6 text-sm text-ink/55">Only the household admin can send invites.</p>
        ) : null}
      </Card>
    </section>
  );
}
