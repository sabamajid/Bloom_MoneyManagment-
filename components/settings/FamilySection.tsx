"use client";

import { Copy, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { HouseholdInviteRow, HouseholdMemberRow, HouseholdRole } from "@/types/household";

type HouseholdGet = {
  error?: string;
  selfUserId?: string;
  householdId?: string;
  householdName?: string;
  role?: HouseholdRole;
  canInvite?: boolean;
  members?: HouseholdMemberRow[];
  invites?: HouseholdInviteRow[];
};

function roleLabel(r: string) {
  if (r === "admin") return "Admin";
  if (r === "full") return "Full access";
  return "Guest";
}

function expiresInLabel(iso: string): string {
  const end = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
  if (s <= 0) return "Expired";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function FamilySection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [data, setData] = useState<HouseholdGet | null>(null);
  const [inviteAccess, setInviteAccess] = useState<"view" | "full">("view");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [memberBusy, setMemberBusy] = useState<string | null>(null);

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

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function generateLink() {
    setError(null);
    setInfo(null);
    setInviteBusy(true);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access: inviteAccess }),
      });
      const payload = (await res.json()) as { error?: string; invite?: { token?: string } };
      if (!res.ok) {
        setError(payload.error ?? "Could not create invite.");
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const token = payload.invite?.token;
      setInfo(
        token
          ? `Link ready — it expires in 15 minutes. Copy and send it to your guest.`
          : "Invite created.",
      );
      if (token && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${origin}/join?token=${token}`);
        setInfo(
          `Copied join link to clipboard. It expires in 15 minutes. Anyone who signs in may join as ${inviteAccess === "full" ? "full access" : "a guest"}.`,
        );
      }
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyActiveLink() {
    const inv = data?.invites?.[0];
    if (!inv?.token) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/join?token=${inv.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setInfo("Link copied. Remaining time updates below.");
    } catch {
      setError("Could not copy — copy from the text manually.");
    }
  }

  async function patchMemberRole(userId: string, role: "view" | "full") {
    setError(null);
    setMemberBusy(userId);
    try {
      const res = await fetch(`/api/household/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not update member.");
        return;
      }
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setMemberBusy(null);
    }
  }

  async function removeMember(userId: string) {
    if (!window.confirm("Remove this person from the household? Their shared expenses stay private to them but leave the family view.")) {
      return;
    }
    setError(null);
    setMemberBusy(userId);
    try {
      const res = await fetch(`/api/household/members/${userId}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not remove member.");
        return;
      }
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setMemberBusy(null);
    }
  }

  const houseTitle = data?.householdName ?? "Family";

  return (
    <section id="family" className="scroll-mt-28 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Family</h2>
      <Card variant="quiet" className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-200/80">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{houseTitle}</p>
            <p className="mt-1 text-sm text-ink/55">
              Share a 15‑minute join link. Guests sign in with their own Google or email, then open the link. Guests see
              household activity; full access can add and edit transactions (24‑hour rules). Savings and cash accounts stay
              under Accounts, per person.
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
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Members & guests</p>
            <ul className="space-y-2">
              {data.members.map((m) => {
                const isAdminRow = m.role === "admin";
                const isSelf = m.user_id === data.selfUserId;
                const canManage = data.canInvite && !isAdminRow && !isSelf;
                const busy = memberBusy === m.user_id;
                return (
                  <li
                    key={m.user_id}
                    className="flex flex-col gap-2 rounded-xl border border-rose-100/80 bg-white/60 px-3 py-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-ink">
                        {m.display_name?.trim() || `Member ${m.user_id.slice(0, 8)}…`}
                      </span>
                      {isSelf ? (
                        <span className="ml-2 text-xs font-medium text-ink/45">(you)</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canManage ? (
                        <select
                          className="rounded-xl border border-rose-100/90 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-ink"
                          value={m.role === "full" ? "full" : "view"}
                          disabled={busy}
                          onChange={(e) => {
                            const v = e.target.value === "full" ? "full" : "view";
                            void patchMemberRole(m.user_id, v);
                          }}
                        >
                          <option value="view">Guest</option>
                          <option value="full">Full access</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-ink/65 ring-1 ring-[var(--soft-ring)]">
                          {roleLabel(m.role)}
                        </span>
                      )}
                      {canManage ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeMember(m.user_id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 bg-rose-50/80 px-2 py-1 text-xs font-semibold text-rose-900 hover:bg-rose-100/80 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {data?.canInvite ? (
          <div className="mt-6 space-y-3 border-t border-rose-100/80 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">15‑minute join link</p>
            <p className="text-xs text-ink/50">
              Generating a new link replaces any previous active link for this household.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 sm:w-48">
                <label htmlFor="inviteAccess" className="mb-1.5 block text-xs font-semibold text-ink/70">
                  They join as
                </label>
                <select
                  id="inviteAccess"
                  className="w-full rounded-2xl border border-rose-100/90 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60"
                  value={inviteAccess}
                  onChange={(e) => setInviteAccess(e.target.value === "full" ? "full" : "view")}
                >
                  <option value="view">Guest — see activity</option>
                  <option value="full">Full — add & edit (24h window)</option>
                </select>
              </div>
              <Button
                type="button"
                disabled={inviteBusy}
                className="w-full sm:w-auto"
                onClick={() => void generateLink()}
              >
                {inviteBusy ? "…" : "Generate link"}
              </Button>
            </div>

            {data.invites?.length ? (
              <div className="rounded-xl border border-violet-100/90 bg-violet-50/50 px-3 py-2 text-sm">
                <p className="font-medium text-ink">
                  Active link ·{" "}
                  <span key={tick} className="text-violet-800">
                    {expiresInLabel(data.invites[0].expires_at)}
                  </span>{" "}
                  left
                </p>
                <p className="mt-1 break-all font-mono text-xs text-ink/65">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/join?token=${data.invites[0].token ?? ""}`
                    : `…/join?token=${data.invites[0].token ?? ""}`}
                </p>
                <button
                  type="button"
                  onClick={() => void copyActiveLink()}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-800 hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy link
                </button>
              </div>
            ) : null}
          </div>
        ) : data?.role && data.role !== "admin" ? (
          <p className="mt-6 text-sm text-ink/55">Only the household admin can create join links.</p>
        ) : null}
      </Card>
    </section>
  );
}
