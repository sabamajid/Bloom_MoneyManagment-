"use client";

import { PiggyBank, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { formatMoney, formatUtcMonthKeyLong } from "@/lib/format";
import type { AccountWithBalance } from "@/types/account";
import type { SavingsMonthlyBreakdown } from "@/types/savings";

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [accountRows, setAccountRows] = useState<Record<string, { name: string; opening: string }>>({});
  const [newName, setNewName] = useState("");
  const [newMoney, setNewMoney] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);

  const [savingsBalance, setSavingsBalance] = useState<number | null>(null);
  const [savingsError, setSavingsError] = useState<string | null>(null);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<SavingsMonthlyBreakdown[]>([]);
  const [savingsLedger, setSavingsLedger] = useState<
    Array<{
      id: string;
      entry_type: string;
      amount: number | string;
      period_month: string;
      title?: string;
      created_at: string;
    }>
  >([]);

  /** Avoid hydration mismatch: server + first client paint must match (use "—"); ellipsis only after mount. */
  const [clientMounted, setClientMounted] = useState(false);
  useEffect(() => {
    setClientMounted(true);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setSavingsError(null);

    setAccountsLoading(true);
    try {
      const accRes = await fetch("/api/accounts");
      const accPayload = (await accRes.json()) as { error?: string; accounts?: AccountWithBalance[] };
      if (!accRes.ok) {
        setError(accPayload.error ?? "Could not load accounts.");
        setAccounts([]);
      } else {
        setAccounts(accPayload.accounts ?? []);
      }
    } catch {
      setError("Network error. Could not load accounts.");
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }

    setSavingsLoading(true);
    try {
      const savRes = await fetch("/api/savings");
      const savPayload = (await savRes.json()) as {
        error?: string;
        balance?: number;
        monthlyBreakdown?: SavingsMonthlyBreakdown[];
        ledger?: Array<{
          id: string;
          entry_type: string;
          amount: number | string;
          period_month: string;
          title?: string;
          created_at: string;
        }>;
      };
      if (!savRes.ok) {
        setSavingsBalance(null);
        setMonthlyBreakdown([]);
        setSavingsLedger([]);
        setSavingsError(
          savPayload.error ??
            "Savings could not load. Run the savings section of supabase/schema.sql if you have not migrated yet. Accounts still work below.",
        );
      } else {
        setSavingsBalance(typeof savPayload.balance === "number" ? savPayload.balance : 0);
        setMonthlyBreakdown(savPayload.monthlyBreakdown ?? []);
        setSavingsLedger(savPayload.ledger ?? []);
      }
    } catch {
      setSavingsBalance(null);
      setMonthlyBreakdown([]);
      setSavingsLedger([]);
      setSavingsError("Network error loading savings.");
    } finally {
      setSavingsLoading(false);
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
    setInfo(null);
    setAddingAccount(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, opening_balance: parsed }),
      });
      let payload: { error?: string } = {};
      try {
        payload = (await res.json()) as { error?: string };
      } catch {
        setError("Invalid response from server.");
        return;
      }
      if (!res.ok) {
        setError(payload.error ?? `Could not add account (${res.status}).`);
        return;
      }

      setNewName("");
      setNewMoney("");
      await load();
      setInfo("Account added.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setAddingAccount(false);
    }
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
    setInfo(null);
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
      await load();
      setInfo("Saved.");
    } finally {
      setSavingId(null);
    }
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setPendingDelete(null);
  }

  async function confirmDeleteAccount() {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setError(null);
    setInfo(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not delete.");
        return;
      }
      setPendingDelete(null);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setAccountRows((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setInfo(`“${name}” was removed.`);
    } catch {
      setError("Network error. Could not delete.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <Modal
        open={pendingDelete != null}
        title="Delete this account?"
        description={
          pendingDelete
            ? `Are you sure you want to remove “${pendingDelete.name}”? Past expenses stay in your history; they will no longer be linked to this account.`
            : undefined
        }
        onClose={closeDeleteModal}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={deletingId != null} onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={deletingId != null}
            onClick={() => void confirmDeleteAccount()}
          >
            {deletingId != null ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </Modal>

      <PageHeader
        title="Accounts & savings"
        description="Cash accounts for day-to-day spending. Month-end budget leftovers roll into your savings pool here (not on the dashboard). You can still record Pay from savings on any transaction."
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
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={addingAccount || accountsLoading}
            onClick={() => void addAccount()}
          >
            {addingAccount ? "…" : "Add account"}
          </Button>
        </div>

        <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-ink/45">Your accounts</h2>
        <div className="mt-3 space-y-3">
          {accountsLoading ? (
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
                      onClick={() => setPendingDelete({ id: a.id, name: a.name })}
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

      <Card variant="quiet" className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-200/80">
              <PiggyBank className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Savings pool</h2>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {clientMounted && savingsLoading
                  ? "…"
                  : savingsBalance == null
                    ? "—"
                    : formatMoney(savingsBalance)}
              </p>
              {savingsError ? (
                <p className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-950">
                  {savingsError}
                </p>
              ) : null}
              <p className="mt-1 max-w-xl text-sm text-ink/55">
                When a month ends, any budget you did not spend here moves into savings automatically (one entry per
                month). Spending from savings is recorded below and does not use accounts.
              </p>
            </div>
          </div>
        </div>

        {monthlyBreakdown.length > 0 ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-rose-100/80 bg-white/60">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-rose-100/80 text-xs font-semibold uppercase tracking-wide text-ink/45">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2 text-right">Surplus in</th>
                  <th className="px-3 py-2 text-right">Spent from savings</th>
                  <th className="px-3 py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.slice(0, 18).map((row) => (
                  <tr key={row.monthKey} className="border-b border-rose-100/50 last:border-0">
                    <td className="px-3 py-2 font-medium text-ink">{formatUtcMonthKeyLong(row.monthKey)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-800">
                      {row.rolloverIn > 0 ? formatMoney(row.rolloverIn) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-800">
                      {row.spentFromSavings > 0 ? formatMoney(row.spentFromSavings) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold tabular-nums",
                        row.net >= 0 ? "text-ink" : "text-rose-700",
                      )}
                    >
                      {formatMoney(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-rose-100/70 bg-white/40 py-4 text-center text-sm text-ink/50">
            Monthly activity will appear after at least one closed month with a budget and surplus, or spending from
            savings.
          </p>
        )}

        {savingsLedger.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/45">History</h3>
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
              {savingsLedger.slice(0, 40).map((row) => {
                const amt = typeof row.amount === "number" ? row.amount : Number.parseFloat(String(row.amount));
                const positive = Number.isFinite(amt) && amt >= 0;
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-rose-100/70 bg-white/50 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 text-ink/80">{row.title ?? row.entry_type}</span>
                    <span
                      className={cn(
                        "shrink-0 font-semibold tabular-nums",
                        positive ? "text-emerald-800" : "text-rose-800",
                      )}
                    >
                      {positive ? "+" : ""}
                      {Number.isFinite(amt) ? formatMoney(Math.abs(amt)) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
