"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { AccountWithBalance } from "@/types/account";

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [accountRows, setAccountRows] = useState<Record<string, { name: string; opening: string }>>({});
  const [newName, setNewName] = useState("");
  const [newMoney, setNewMoney] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/accounts");
      const payload = (await res.json()) as { error?: string; accounts?: AccountWithBalance[] };
      if (!res.ok) {
        setError(payload.error ?? "Could not load accounts.");
        setAccounts([]);
        return;
      }
      setAccounts(payload.accounts ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [accounts],
  );

  useEffect(() => {
    const next: Record<string, { name: string; opening: string }> = {};
    for (const a of accounts) {
      next[a.id] = { name: a.name, opening: String(a.opening_balance) };
    }
    setAccountRows(next);
  }, [accounts]);

  async function addAccount() {
    const name = newName.trim();
    if (name.length < 1) {
      setError("Enter a name.");
      return;
    }
    const parsed = Number.parseFloat(newMoney.trim() || "0");
    if (!Number.isFinite(parsed)) {
      setError("Enter a valid amount.");
      return;
    }
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, opening_balance: parsed }),
    });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) return setError(payload.error ?? "Could not add account.");

    setNewName("");
    setNewMoney("");
    setInfo("Account added.");
    await load();
  }

  async function saveRow(id: string) {
    const row = accountRows[id];
    if (!row) return;
    const name = row.name.trim();
    if (name.length < 1) {
      setError("Name is required.");
      return;
    }
    const parsed = Number.parseFloat(row.opening.trim() || "0");
    if (!Number.isFinite(parsed)) {
      setError("Balance must be a number.");
      return;
    }
    setError(null);
    setSavingId(id);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, opening_balance: parsed }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not save.");
        return;
      }
      setInfo("Saved.");
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(id: string) {
    const ok = window.confirm("Delete this account? Only allowed if it has no transactions.");
    if (!ok) return;

    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not delete.");
        return;
      }
      setInfo("Deleted.");
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounts"
        description="Add an account with a name and balance. Transactions reduce that balance automatically."
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm font-medium text-rose-900">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-900">
          {info}
        </div>
      ) : null}

      <Card variant="quiet" className="p-5 sm:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">New account</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-[12rem]">
            <Input
              id="newAccountName"
              label="Name"
              placeholder="e.g. Main wallet"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-[12rem]">
            <Input
              id="newAccountMoney"
              label="Balance (PKR)"
              inputMode="decimal"
              placeholder="0"
              value={newMoney}
              onChange={(e) => setNewMoney(e.target.value)}
            />
          </div>
          <Button type="button" className="w-full sm:w-auto" onClick={() => void addAccount()}>
            Add account
          </Button>
        </div>

        <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-ink/45">Your accounts</h2>
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="rounded-2xl bg-white/50 py-10 text-center text-sm text-ink/50">…</div>
          ) : sorted.length ? (
            sorted.map((a) => {
              const row = accountRows[a.id];
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 rounded-2xl border border-rose-100/80 bg-white/75 p-4 sm:flex-row sm:flex-wrap sm:items-end"
                >
                  <div className="min-w-0 flex-1 sm:max-w-[16rem]">
                    <Input
                      id={`acc-name-${a.id}`}
                      label="Name"
                      value={row?.name ?? a.name}
                      onChange={(e) =>
                        setAccountRows((prev) => ({
                          ...prev,
                          [a.id]: {
                            name: e.target.value,
                            opening: prev[a.id]?.opening ?? String(a.opening_balance),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1 sm:max-w-[12rem]">
                    <Input
                      id={`acc-open-${a.id}`}
                      label="Balance (PKR)"
                      inputMode="decimal"
                      value={row?.opening ?? String(a.opening_balance)}
                      onChange={(e) =>
                        setAccountRows((prev) => ({
                          ...prev,
                          [a.id]: {
                            name: prev[a.id]?.name ?? a.name,
                            opening: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 basis-full flex-col gap-1 sm:basis-auto sm:justify-end">
                    <p className="text-xs font-semibold text-ink/45">Left in account</p>
                    <p
                      className={cn(
                        "text-base font-semibold tabular-nums text-ink",
                        a.balance < 0 && "text-rose-700",
                      )}
                    >
                      {formatMoney(a.balance)}
                    </p>
                    <p className="text-xs text-ink/50">Spent (all time): {formatMoney(a.spent)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={savingId === a.id || deletingId === a.id}
                      onClick={() => void saveRow(a.id)}
                    >
                      {savingId === a.id ? "…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-700 hover:bg-rose-50"
                      disabled={deletingId === a.id || savingId === a.id}
                      onClick={() => void deleteRow(a.id)}
                      aria-label="Delete account"
                    >
                      {deletingId === a.id ? "…" : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl border border-rose-100/80 bg-white/50 py-6 text-center text-sm text-ink/45">
              No accounts yet — add one above.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
