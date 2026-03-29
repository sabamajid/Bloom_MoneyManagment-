"use client";

import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  PiggyBank,
  Plus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AddExpenseModal } from "@/components/expense/AddExpenseModal";
import { ExpenseListItem } from "@/components/expense/ExpenseListItem";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { formatMoney, monthKeyFromDate, utcCalendarDateKeyFromIso } from "@/lib/format";
import type { AccountWithBalance } from "@/types/account";
import type { Expense } from "@/types/expense";

type CategoryLimitItem = {
  id: string;
  name: string;
  limitAmount: number | string | null;
};

function normalizeAmount(amount: Expense["amount"]) {
  if (typeof amount === "number") return amount;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

type DashboardClientProps = {
  calendarMonth: string;
  todayUtc: string;
};

export function DashboardClient({ calendarMonth, todayUtc }: DashboardClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const [expensesRes, limitRes, categoriesRes, accountsRes] = await Promise.all([
        fetch(`/api/expenses?month=${calendarMonth}`, { method: "GET" }),
        fetch(`/api/monthly-limit?month=${calendarMonth}`, { method: "GET" }),
        fetch("/api/categories", { method: "GET" }),
        fetch("/api/accounts", { method: "GET" }),
      ]);

      const expensesPayload = (await expensesRes.json()) as {
        error?: string;
        expenses?: Expense[];
      };
      const limitPayload = (await limitRes.json()) as {
        error?: string;
        limitAmount?: number | string | null;
      };
      const categoriesPayload = (await categoriesRes.json()) as {
        error?: string;
        categories?: CategoryLimitItem[];
      };
      const accountsPayload = (await accountsRes.json()) as {
        error?: string;
        accounts?: AccountWithBalance[];
      };

      if (accountsRes.ok) {
        setAccounts(accountsPayload.accounts ?? []);
      }

      if (!expensesRes.ok) {
        setError(expensesPayload.error ?? "Could not load your expenses.");
        setExpenses([]);
      } else {
        setExpenses(expensesPayload.expenses ?? []);
      }

      if (!limitRes.ok) {
        setError((prev) => prev ?? limitPayload.error ?? "Could not load monthly limit.");
      } else {
        const raw = limitPayload.limitAmount;
        if (raw === null || raw === undefined) {
          setMonthlyLimit(null);
        } else {
          const n = typeof raw === "number" ? raw : Number.parseFloat(raw);
          if (Number.isFinite(n)) setMonthlyLimit(n);
        }
      }

      if (!categoriesRes.ok) {
        setError((prev) => prev ?? categoriesPayload.error ?? "Could not load category limits.");
      } else {
        setCategoryLimits(categoriesPayload.categories ?? []);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [calendarMonth]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const spentByCategoryThisMonth = useMemo(() => {
    const spentByCategory = new Map<string, number>();
    for (const e of expenses) {
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) continue;
      if (monthKeyFromDate(d) !== calendarMonth) continue;
      const amt = normalizeAmount(e.amount);
      spentByCategory.set(e.category, (spentByCategory.get(e.category) ?? 0) + amt);
    }
    return spentByCategory;
  }, [expenses, calendarMonth]);

  const monthSpent = useMemo(() => {
    let total = 0;
    for (const v of spentByCategoryThisMonth.values()) total += v;
    return total;
  }, [spentByCategoryThisMonth]);

  const amountLeft = monthlyLimit === null ? null : monthlyLimit - monthSpent;
  const percentUsed =
    monthlyLimit && monthlyLimit > 0
      ? Math.max(0, Math.min(100, (monthSpent / monthlyLimit) * 100))
      : 0;

  const categoryBudgetProgress = useMemo(() => {
    const rows: Array<{
      category: string;
      spent: number;
      limit: number;
      percent: number;
    }> = [];
    for (const c of categoryLimits) {
      if (c.limitAmount == null) continue;
      const limit =
        typeof c.limitAmount === "number" ? c.limitAmount : Number.parseFloat(String(c.limitAmount));
      if (!Number.isFinite(limit) || limit <= 0) continue;
      const spent = spentByCategoryThisMonth.get(c.name) ?? 0;
      const percent = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
      rows.push({ category: c.name, spent, limit, percent });
    }
    return rows.sort((a, b) => b.percent - a.percent);
  }, [categoryLimits, spentByCategoryThisMonth]);

  const categoryLimitAlerts = useMemo(() => {
    const alerts: Array<{
      category: string;
      spent: number;
      limit: number;
      percent: number;
      status: "warning" | "exceeded";
      diff: number;
    }> = [];
    for (const row of categoryBudgetProgress) {
      if (row.percent < 80) continue;
      const exceeded = row.spent > row.limit;
      alerts.push({
        category: row.category,
        spent: row.spent,
        limit: row.limit,
        percent: row.percent,
        status: exceeded ? "exceeded" : "warning",
        diff: exceeded ? row.spent - row.limit : row.limit - row.spent,
      });
    }
    return alerts.sort((a, b) => b.percent - a.percent);
  }, [categoryBudgetProgress]);

  const todayExpenses = useMemo(() => {
    if (!todayUtc) return [];
    const list = expenses.filter((e) => utcCalendarDateKeyFromIso(e.date) === todayUtc);
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [expenses, todayUtc]);

  const accountLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) {
      m.set(a.id, a.name);
    }
    return m;
  }, [accounts]);

  const totalAccountBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts],
  );

  const monthBadge = (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold text-ink/65 ring-1 ring-[var(--soft-ring)]">
      <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="tabular-nums">{calendarMonth}</span>
    </span>
  );

  return (
    <div className="space-y-10">
      <PageHeader
        badge={monthBadge}
        title="Dashboard"
        action={
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 shrink-0" />
            Add transaction
          </Button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm font-semibold text-rose-900">
          {error}
        </div>
      ) : null}

      <Section title="This month">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/settings" className="group block min-h-0 rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas">
            <StatCard
              kicker="Budget"
              value={monthlyLimit === null ? "—" : formatMoney(monthlyLimit)}
              icon={PiggyBank}
              tone="rose"
              className="h-full transition group-hover:brightness-[1.02]"
            />
          </Link>

          <StatCard
            kicker="Spent"
            value={formatMoney(monthSpent)}
            icon={CircleDollarSign}
            tone="violet"
          />

          <StatCard
            kicker="Left"
            value={amountLeft === null ? "—" : formatMoney(amountLeft)}
            icon={Wallet}
            tone="emerald"
          />
        </div>

        {monthlyLimit ? (
          <Card variant="quiet" className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink/80">Total</p>
              <p className="text-sm font-semibold tabular-nums text-ink">{percentUsed.toFixed(1)}%</p>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-[var(--soft-ring)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 transition-all duration-500"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </Card>
        ) : (
          <Link
            href="/settings"
            className="inline-flex text-sm font-medium text-fuchsia-700 underline-offset-2 hover:underline"
          >
            Set budget in Settings →
          </Link>
        )}
      </Section>

      <Section
        title="Accounts"
        action={
          <Link href="/accounts" className="text-sm font-medium text-fuchsia-700 hover:underline">
            Manage →
          </Link>
        }
      >
        {accounts.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => {
                const low = a.balance < 0;
                return (
                  <Card key={a.id} variant="quiet" className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1",
                          "bg-violet-50 text-violet-800 ring-violet-200/80",
                        )}
                      >
                        <Wallet className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{a.name}</p>
                        <p className="text-xs text-ink/55">Spent {formatMoney(a.spent)}</p>
                        <p
                          className={cn(
                            "mt-2 text-lg font-semibold tabular-nums text-ink",
                            low && "text-rose-700",
                          )}
                        >
                          {formatMoney(a.balance)}
                        </p>
                        <p className="text-xs text-ink/45">Left in account</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <p className="mt-4 text-sm font-medium text-ink/60">
              Total across accounts:{" "}
              <span className="tabular-nums text-ink">{formatMoney(totalAccountBalance)}</span>
            </p>
          </>
        ) : !loading ? (
          <Card variant="quiet" className="p-4 sm:p-5">
            <p className="text-sm text-ink/60">
              Add an account with a name and balance. Each transaction uses one account; balances update automatically.
            </p>
            <Link
              href="/accounts"
              className="mt-3 inline-block text-sm font-semibold text-fuchsia-700 hover:underline"
            >
              Accounts →
            </Link>
          </Card>
        ) : null}
      </Section>

      {categoryBudgetProgress.length > 0 ? (
        <Section title="Categories">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categoryBudgetProgress.map((row) => {
              const over = row.spent > row.limit;
              const warn = !over && row.percent >= 80;
              return (
                <Card key={row.category} variant="quiet" className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{row.category}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                        over
                          ? "bg-rose-100/90 text-rose-800 ring-1 ring-rose-200/80"
                          : warn
                            ? "bg-amber-100/90 text-amber-900 ring-1 ring-amber-200/80"
                            : "bg-white/80 text-ink/70 ring-1 ring-[var(--soft-ring)]",
                      )}
                    >
                      {row.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-rose-100/80">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        over
                          ? "bg-gradient-to-r from-rose-500 to-rose-400"
                          : warn
                            ? "bg-gradient-to-r from-amber-400 to-amber-300"
                            : "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400",
                      )}
                      style={{ width: `${Math.min(100, row.percent)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-medium text-ink/55">
                    {formatMoney(row.spent)} of {formatMoney(row.limit)}
                    {over ? (
                      <span className="text-rose-700"> · {formatMoney(row.spent - row.limit)} over</span>
                    ) : null}
                  </p>
                </Card>
              );
            })}
          </div>
        </Section>
      ) : null}

      <Section
        title="Today's transactions"
        action={
          <Link
            href="/expenses"
            className="text-sm font-medium text-fuchsia-700 hover:underline"
          >
            All →
          </Link>
        }
      >
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-white/50 ring-1 ring-rose-100/70"
              />
            ))}
          </div>
        ) : todayExpenses.length ? (
          <div className="grid gap-3">
            {todayExpenses.map((e) => (
              <ExpenseListItem
                key={e.id}
                expense={e}
                accountLabel={
                  e.account_id ? accountLabelById.get(e.account_id) ?? null : null
                }
                onDeleted={() => {
                  void loadAll();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100/70 bg-white/50 px-4 py-3.5 sm:px-5">
            <p className="text-sm text-ink/60">No transactions today.</p>
            <Button type="button" size="md" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 shrink-0" />
              Add transaction
            </Button>
          </div>
        )}
      </Section>

      {categoryLimitAlerts.length > 0 ? (
        <Section
          title="Alerts"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-[var(--soft-ring)]">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              {categoryLimitAlerts.length}
            </span>
          }
        >
          <Card variant="quiet" className="p-4 sm:p-5">
            <div className="space-y-3">
              {categoryLimitAlerts.map((item) => (
                <div
                  key={item.category}
                  className={cn(
                    "rounded-2xl border px-3.5 py-3",
                    item.status === "exceeded"
                      ? "border-rose-200/80 bg-rose-50/80"
                      : "border-amber-200/80 bg-amber-50/80",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        item.status === "exceeded" ? "text-rose-900" : "text-amber-900",
                      )}
                    >
                      {item.category}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        item.status === "exceeded" ? "text-rose-800" : "text-amber-800",
                      )}
                    >
                      {item.status === "exceeded"
                        ? `Over by ${formatMoney(item.diff)}`
                        : `${item.percent.toFixed(1)}% used`}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-sm",
                      item.status === "exceeded" ? "text-rose-900/90" : "text-amber-900/90",
                    )}
                  >
                    Spent {formatMoney(item.spent)} / Limit {formatMoney(item.limit)}
                  </p>
                  {item.status === "warning" ? (
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      {formatMoney(item.diff)} left at this cap.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </Section>
      ) : null}

      <AddExpenseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => {
          void loadAll();
        }}
      />
    </div>
  );
}
