"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCategoryMeta } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatExpenseDate, formatMoney } from "@/lib/format";
import type { Expense } from "@/types/expense";

function normalizeAmount(amount: Expense["amount"]) {
  if (typeof amount === "number") return amount;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

export function ExpenseListItem({
  expense,
  accountLabel,
  canEdit,
  onEdit,
}: {
  expense: Expense;
  /** Friendly label when `account_id` is set; omit for older rows without an account. */
  accountLabel?: string | null;
  /** When true and `onEdit` is set, shows an Edit control (e.g. within 24h of `created_at`). */
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const fromSavings = (expense.spend_source ?? "budget") === "savings";
  const meta = getCategoryMeta(expense.category);
  const Icon = meta.icon;

  const dateLabel = formatExpenseDate(expense.spent_at);
  const showEdit = Boolean(canEdit && onEdit);

  return (
    <Card variant="quiet" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1",
              meta.swatchClassName,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-ink">{meta.label}</div>
              <div className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55 ring-1 ring-rose-100/70">
                {dateLabel}
              </div>
              {fromSavings ? (
                <div className="rounded-full bg-teal-50/90 px-2 py-0.5 text-[11px] font-semibold text-teal-900/90 ring-1 ring-teal-200/80">
                  Savings
                </div>
              ) : (
                <div className="rounded-full bg-emerald-50/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-900/85 ring-1 ring-emerald-200/80">
                  Budget
                </div>
              )}
              {!fromSavings && accountLabel ? (
                <div className="rounded-full bg-violet-50/90 px-2 py-0.5 text-[11px] font-semibold text-violet-900/90 ring-1 ring-violet-200/80">
                  {accountLabel}
                </div>
              ) : !fromSavings && !accountLabel ? (
                <div className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-ink/45 ring-1 ring-rose-100/60">
                  {expense.account_id ? "Account removed" : "No account"}
                </div>
              ) : null}
            </div>
            {expense.note ? (
              <p className="mt-1 line-clamp-2 text-sm text-ink/65">{expense.note}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-base font-semibold tracking-tight text-ink">
            {formatMoney(normalizeAmount(expense.amount))}
          </div>
          {showEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 rounded-2xl px-2.5 py-2 text-ink/80 hover:bg-white/70"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
