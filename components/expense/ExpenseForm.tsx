"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import { formatMoney, utcCalendarDateKeyFromIso } from "@/lib/format";
import type { AccountWithBalance } from "@/types/account";
import type { Expense, SpendSource } from "@/types/expense";

export function ExpenseForm({
  mode = "create",
  initialExpense = null,
  onSuccess,
  onCancel,
}: {
  mode?: "create" | "edit";
  initialExpense?: Expense | null;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [amount, setAmount] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [spendSource, setSpendSource] = useState<SpendSource>("budget");
  const [savingsBalance, setSavingsBalance] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function refreshSavings() {
    try {
      const res = await fetch("/api/savings");
      const payload = (await res.json()) as { error?: string; balance?: number };
      if (res.ok && typeof payload.balance === "number") {
        setSavingsBalance(payload.balance);
      }
    } catch {
      setSavingsBalance(null);
    }
  }

  useEffect(() => {
    if (mode !== "edit" || !initialExpense) return;
    const exp = initialExpense;
    const amt = typeof exp.amount === "number" ? exp.amount : Number.parseFloat(String(exp.amount));
    setAmount(Number.isFinite(amt) ? String(amt) : "");
    setCategory(exp.category);
    setDate(utcCalendarDateKeyFromIso(exp.date) ?? today);
    setNote(exp.note ?? "");
    setSpendSource(exp.spend_source ?? "budget");
    setAccountId(exp.account_id ?? "");
  }, [mode, initialExpense?.id, today, initialExpense]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategoriesAndAccounts() {
      try {
        const [catRes, accRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/accounts"),
        ]);
        const catPayload = (await catRes.json()) as {
          categories?: Array<{ name: string }>;
        };
        const accPayload = (await accRes.json()) as {
          accounts?: AccountWithBalance[];
        };
        if (cancelled) return;
        if (catRes.ok) {
          const names = (catPayload.categories ?? []).map((c) => c.name);
          setCategories(names);
          if (mode === "create") {
            setCategory((prev) => (prev && names.includes(prev) ? prev : names[0] ?? ""));
          }
        }
        if (accRes.ok) {
          const list = accPayload.accounts ?? [];
          setAccounts(list);
          setAccountId((prev) => (prev && list.some((a) => a.id === prev) ? prev : list[0]?.id ?? ""));
        }
      } catch {
        // leave empty
      }
    }
    void loadCategoriesAndAccounts();
    void refreshSavings();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function categoryIsAllowed(name: string) {
    if (categories.includes(name)) return true;
    if (mode === "edit" && initialExpense?.category === name) return true;
    return false;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!category || !categoryIsAllowed(category)) {
      setError("Add a category in Settings first.");
      return;
    }
    if (spendSource === "budget" && (!accountId || !accounts.some((a) => a.id === accountId))) {
      setError("Add an account first (Accounts in the nav).");
      return;
    }
    if (spendSource === "savings" && savingsBalance != null && parsedAmount > savingsBalance + 1e-6) {
      setError("That amount is more than your current savings.");
      return;
    }

    setPending(true);
    try {
      if (mode === "edit" && initialExpense) {
        const res = await fetch(`/api/expenses/${initialExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parsedAmount,
            category,
            date,
            note: note.trim().length ? note.trim() : null,
            spendSource,
            accountId: spendSource === "budget" ? accountId : undefined,
          }),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(payload.error ?? "Could not update expense.");
          return;
        }
        void refreshSavings();
        onSuccess();
        return;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          category,
          date,
          note: note.trim().length ? note.trim() : null,
          spendSource,
          accountId: spendSource === "budget" ? accountId : undefined,
        }),
      });

      const payload = (await res.json()) as { error?: string; expense?: Expense };
      if (!res.ok) {
        setError(payload.error ?? "Could not save expense.");
        return;
      }

      if (!payload.expense) {
        setError("Unexpected response from server.");
        return;
      }

      setAmount("");
      setNote("");
      setDate(today);
      setCategory(categories[0] ?? "");
      setAccountId(accounts[0]?.id ?? "");
      setSpendSource("budget");
      void refreshSavings();
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit" || !initialExpense) return;
    const ok = window.confirm("Delete this transaction? This cannot be undone.");
    if (!ok) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${initialExpense.id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not delete.");
        return;
      }
      void refreshSavings();
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const sourceBtn = (value: SpendSource, label: string, hint: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setSpendSource(value)}
      className={cn(
        "flex flex-1 flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition",
        spendSource === value
          ? "border-violet-300 bg-violet-50/90 text-violet-950 ring-2 ring-violet-200/80"
          : "border-rose-100/90 bg-white/70 text-ink/75 hover:border-rose-200/90",
      )}
    >
      <span>{label}</span>
      <span className="text-[11px] font-medium text-ink/50">{hint}</span>
    </button>
  );

  const saveDisabled =
    pending ||
    deleting ||
    !categories.length ||
    (spendSource === "budget" && !accounts.length);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-2.5 text-sm font-semibold text-rose-900">
          {error}
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 block text-xs font-semibold text-ink/70">Pay from</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {sourceBtn("budget", "Budget", "Counts toward monthly limit · picks an account")}
          {sourceBtn("savings", "Savings", "Does not use budget or accounts")}
        </div>
        {spendSource === "savings" ? (
          <p className="mt-2 text-xs text-ink/55">
            Available in savings:{" "}
            <span className="font-semibold tabular-nums text-ink">
              {savingsBalance == null ? "—" : formatMoney(savingsBalance)}
            </span>
            .{" "}
            <Link href="/accounts" className="font-medium text-fuchsia-700 hover:underline">
              Savings balance on Accounts
            </Link>
          </p>
        ) : null}
      </div>

      <Input
        id="amount"
        label="Amount"
        inputMode="decimal"
        autoComplete="off"
        placeholder="28.50"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <div className="w-full">
        <label htmlFor="category" className="mb-1.5 block text-xs font-semibold text-ink/70">
          Category
        </label>
        <select
          id="category"
          required
          className={cn(
            "w-full rounded-2xl border border-rose-100/90 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none",
            "focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60",
            !categories.length && "opacity-60",
          )}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={!categories.length && !(mode === "edit" && category)}
        >
          {!categories.length && !category ? (
            <option value="">—</option>
          ) : null}
          {category && !categories.includes(category) ? (
            <option value={category}>{category} (unlisted)</option>
          ) : null}
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {!categories.length ? (
          <p className="mt-1.5 text-xs text-ink/55">
            <Link href="/settings" className="font-medium text-fuchsia-700 hover:underline">
              Settings
            </Link>{" "}
            → Categories
          </p>
        ) : null}
      </div>

      {spendSource === "budget" ? (
        <div className="w-full">
          <label htmlFor="account" className="mb-1.5 block text-xs font-semibold text-ink/70">
            From account
          </label>
          <select
            id="account"
            required
            className={cn(
              "w-full rounded-2xl border border-rose-100/90 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none",
              "focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60",
              !accounts.length && "opacity-60",
            )}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={!accounts.length}
          >
            {!accounts.length ? (
              <option value="">—</option>
            ) : null}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {formatMoney(a.balance)}
              </option>
            ))}
          </select>
          {!accounts.length ? (
            <p className="mt-1.5 text-xs text-ink/55">
              <Link href="/accounts" className="font-medium text-fuchsia-700 hover:underline">
                Accounts
              </Link>{" "}
              — add one with a name and balance first.
            </p>
          ) : null}
        </div>
      ) : null}

      <Input
        id="date"
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <Textarea
        id="note"
        label="Note"
        placeholder="Optional"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {mode === "edit" ? (
        <p className="text-xs text-ink/50">
          You can edit or delete this transaction for 24 hours after it was added.
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending || deleting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={saveDisabled}>
          {pending ? "…" : mode === "edit" ? "Save changes" : "Save"}
        </Button>
      </div>

      {mode === "edit" ? (
        <div className="border-t border-rose-100/80 pt-4">
          <Button
            type="button"
            variant="danger"
            className="w-full sm:w-auto"
            disabled={pending || deleting}
            onClick={() => void onDelete()}
          >
            {deleting ? "…" : "Delete transaction"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
