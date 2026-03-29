"use client";

import { Download, Filter, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ExpenseListItem } from "@/components/expense/ExpenseListItem";
import {
  TransactionModal,
  type TransactionModalState,
} from "@/components/expense/TransactionModal";
import { ExpensesMiniCalendar } from "@/components/expenses/ExpensesMiniCalendar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { isExpenseEditable } from "@/lib/expenseEditWindow";
import {
  formatMoney,
  formatUtcDayKeyNice,
  formatUtcMonthKeyLong,
  utcCalendarDateKeyFromIso,
} from "@/lib/format";
import { downloadExpensesMonthPdf } from "@/lib/pdf/expenseMonthPdf";
import type { AccountWithBalance } from "@/types/account";
import type { Expense } from "@/types/expense";

type Props = {
  initialMonth: string;
  todayUtc: string;
};

function normalizeAmount(amount: Expense["amount"]) {
  if (typeof amount === "number") return amount;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

export function ExpensesClient({ initialMonth, todayUtc }: Props) {
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionModal, setTransactionModal] = useState<TransactionModalState | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [accountLabelRows, setAccountLabelRows] = useState<Array<{ id: string; name: string }>>([]);
  const [canWriteExpenses, setCanWriteExpenses] = useState(true);

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("month", viewMonth);
    if (category !== "all") qs.set("category", category);
    return `/api/expenses?${qs.toString()}`;
  }, [viewMonth, category]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [res, accRes, labelsRes, householdRes] = await Promise.all([
        fetch(query, { method: "GET" }),
        fetch("/api/accounts", { method: "GET" }),
        fetch("/api/accounts/household-labels", { method: "GET" }),
        fetch("/api/household", { method: "GET" }),
      ]);
      const payload = (await res.json()) as { error?: string; expenses?: Expense[] };
      const accPayload = (await accRes.json()) as { accounts?: AccountWithBalance[] };
      const labelsPayload = (await labelsRes.json()) as {
        error?: string;
        accounts?: Array<{ id: string; name: string }>;
      };
      const householdPayload = (await householdRes.json()) as {
        error?: string;
        canWriteExpenses?: boolean;
      };

      if (householdRes.ok) {
        setCanWriteExpenses(householdPayload.canWriteExpenses !== false);
      } else {
        setCanWriteExpenses(true);
      }

      if (accRes.ok) {
        setAccounts(accPayload.accounts ?? []);
      }

      if (labelsRes.ok) {
        const rows = labelsPayload.accounts ?? [];
        setAccountLabelRows(rows.map((r) => ({ id: r.id, name: r.name })));
      } else {
        setAccountLabelRows([]);
      }

      if (!res.ok) {
        setError(payload.error ?? "Could not load expenses.");
        setMonthExpenses([]);
        return;
      }

      setMonthExpenses(payload.expenses ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/categories");
        const payload = (await res.json()) as { categories?: Array<{ name: string }> };
        if (!res.ok || cancelled) return;
        const names = (payload.categories ?? []).map((c) => c.name);
        if (names.length) setCategories(names);
      } catch {
        // keep defaults
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of monthExpenses) {
      const key = utcCalendarDateKeyFromIso(e.date);
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + normalizeAmount(e.amount));
    }
    return m;
  }, [monthExpenses]);

  const displayedExpenses = useMemo(() => {
    if (!selectedDay) return monthExpenses;
    return monthExpenses.filter((e) => utcCalendarDateKeyFromIso(e.date) === selectedDay);
  }, [monthExpenses, selectedDay]);

  const displayedTotal = useMemo(
    () => displayedExpenses.reduce((s, e) => s + normalizeAmount(e.amount), 0),
    [displayedExpenses],
  );

  const accountLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) {
      m.set(a.id, a.name);
    }
    for (const r of accountLabelRows) {
      if (!m.has(r.id)) m.set(r.id, r.name);
    }
    return m;
  }, [accounts, accountLabelRows]);

  function handleViewMonthChange(monthKey: string) {
    setViewMonth(monthKey);
    setSelectedDay(null);
  }

  function handleToggleDay(dayKey: string) {
    setSelectedDay((prev) => (prev === dayKey ? null : dayKey));
  }

  async function handleDownloadPdf() {
    setPdfError(null);
    setDownloadingPdf(true);
    try {
      const limitRes = await fetch(`/api/monthly-limit?month=${viewMonth}`);
      const limitPayload = (await limitRes.json()) as {
        error?: string;
        limitAmount?: number | string | null;
      };
      if (!limitRes.ok) {
        setPdfError(limitPayload.error ?? "Could not load limit.");
        return;
      }
      const raw = limitPayload.limitAmount;
      const monthlyLimit =
        raw == null ? null : typeof raw === "number" ? raw : Number.parseFloat(String(raw));
      const limit = monthlyLimit != null && Number.isFinite(monthlyLimit) ? monthlyLimit : null;

      const theme = document.documentElement.getAttribute("data-theme");
      downloadExpensesMonthPdf({
        monthKey: viewMonth,
        expenses: monthExpenses,
        monthlyLimit: limit,
        themeAttr: theme,
        categoryFilterLabel: category === "all" ? null : category,
      });
    } catch {
      setPdfError("Could not create PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  const monthTitle = useMemo(() => formatUtcMonthKeyLong(viewMonth), [viewMonth]);

  return (
    <div className="relative pb-24 sm:pb-8">
      <PageHeader title="Expenses" />

      <div className="mt-6 space-y-4">
        {error ? (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm font-medium text-rose-900">
            {error}
          </div>
        ) : null}

        <Card
          className={cn(
            "p-4 sm:p-5",
            calendarOpen && "relative z-50 overflow-visible",
          )}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
            <div className="min-w-0 flex-1">
              <ExpensesMiniCalendar
                viewMonth={viewMonth}
                todayUtc={todayUtc}
                selectedDay={selectedDay}
                onToggleDay={handleToggleDay}
                onViewMonthChange={handleViewMonthChange}
                dayTotals={dayTotals}
                onOpenChange={setCalendarOpen}
              />
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-52 lg:shrink-0">
              {pdfError ? (
                <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-medium text-rose-900">
                  {pdfError}
                </div>
              ) : null}
              <div>
                <label htmlFor="expense-category" className="sr-only">
                  Category
                </label>
                <div className="relative">
                  <Filter
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-500/80"
                    aria-hidden
                  />
                  <select
                    id="expense-category"
                    className={cn(
                      "w-full appearance-none rounded-2xl border border-rose-100/90 bg-white/85 py-2.5 pl-9 pr-3 text-sm text-ink shadow-sm outline-none",
                      "focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60",
                    )}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">All categories</option>
                    {categories.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2 hover:!translate-y-0 active:!translate-y-0"
                disabled={downloadingPdf || loading}
                onClick={() => void handleDownloadPdf()}
              >
                <Download className="h-4 w-4 shrink-0" />
                {downloadingPdf ? "…" : "PDF"}
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-rose-100/70 pt-4">
            <p className="text-sm text-ink/70">
              <span className="font-medium text-ink">{monthTitle}</span>
              {selectedDay ? (
                <>
                  <span className="text-ink/40"> · </span>
                  <span className="font-medium text-ink">{formatUtcDayKeyNice(selectedDay)}</span>
                </>
              ) : null}
              {category !== "all" ? (
                <>
                  <span className="text-ink/40"> · </span>
                  <span className="text-ink/80">{category}</span>
                </>
              ) : null}
            </p>
            <p className="text-lg font-semibold tabular-nums text-ink">{formatMoney(displayedTotal)}</p>
          </div>
        </Card>

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-white/50 ring-1 ring-rose-100/70"
              />
            ))}
          </div>
        ) : displayedExpenses.length ? (
          <div className="grid gap-2">
            {displayedExpenses.map((e) => (
              <ExpenseListItem
                key={e.id}
                expense={e}
                accountLabel={
                  e.account_id ? accountLabelById.get(e.account_id) ?? null : null
                }
                canEdit={canWriteExpenses && isExpenseEditable(e.created_at)}
                onEdit={
                  canWriteExpenses && isExpenseEditable(e.created_at)
                    ? () => setTransactionModal({ type: "edit", expense: e })
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <Card variant="quiet" className="flex flex-col items-center py-12 text-center">
            <p className="text-sm font-medium text-ink/60">No expenses</p>
            {canWriteExpenses ? (
              <Button type="button" size="lg" className="mt-4" onClick={() => setTransactionModal({ type: "add" })}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            ) : null}
          </Card>
        )}
      </div>

      {canWriteExpenses ? (
        <Button
          type="button"
          size="lg"
          className="fixed bottom-5 right-4 z-30 h-14 w-14 rounded-full p-0 shadow-[0_12px_40px_-8px_rgba(236,72,153,0.55)] sm:bottom-6 sm:right-6 sm:h-[3.25rem] sm:w-auto sm:rounded-2xl sm:px-5"
          onClick={() => setTransactionModal({ type: "add" })}
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Add transaction</span>
        </Button>
      ) : null}

      <TransactionModal
        state={transactionModal}
        onClose={() => setTransactionModal(null)}
        onFinished={() => {
          void load();
        }}
      />
    </div>
  );
}
