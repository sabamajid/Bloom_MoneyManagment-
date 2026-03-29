"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { AccountWithBalance } from "@/types/account";
import type { Expense } from "@/types/expense";

export function ExpenseForm({
  onCreated,
  onCancel,
}: {
  onCreated: (expense: Expense) => void;
  onCancel?: () => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [amount, setAmount] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
          setCategory((prev) => (prev && names.includes(prev) ? prev : names[0] ?? ""));
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
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!category || !categories.includes(category)) {
      setError("Add a category in Settings first.");
      return;
    }
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setError("Add an account first (Accounts in the nav).");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          category,
          date,
          note: note.trim().length ? note.trim() : null,
          accountId,
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

      onCreated(payload.expense);
      setAmount("");
      setNote("");
      setDate(today);
      setCategory(categories[0] ?? "");
      setAccountId(accounts[0]?.id ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-2.5 text-sm font-semibold text-rose-900">
          {error}
        </div>
      ) : null}

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
          disabled={!categories.length}
        >
          {!categories.length ? (
            <option value="">—</option>
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={pending || !categories.length || !accounts.length}>
          {pending ? "…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
