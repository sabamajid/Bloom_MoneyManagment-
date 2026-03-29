"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

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
  onDeleted,
  accountLabel,
}: {
  expense: Expense;
  onDeleted: (id: string) => void;
  /** Friendly label when `account_id` is set; omit for older rows without an account. */
  accountLabel?: string | null;
}) {
  const meta = getCategoryMeta(expense.category);
  const Icon = meta.icon;
  const [pending, setPending] = useState(false);

  const dateLabel = formatExpenseDate(expense.date);

  async function onDelete() {
    const ok = window.confirm("Delete this expense?");
    if (!ok) return;

    setPending(true);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(payload.error ?? "Could not delete expense.");
        return;
      }
      onDeleted(expense.id);
    } catch {
      window.alert("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

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
              {accountLabel ? (
                <div className="rounded-full bg-violet-50/90 px-2 py-0.5 text-[11px] font-semibold text-violet-900/90 ring-1 ring-violet-200/80">
                  {accountLabel}
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
          <Button
            type="button"
            variant="ghost"
            className="rounded-2xl px-2.5 py-2 text-rose-700 hover:bg-rose-50"
            onClick={onDelete}
            disabled={pending}
            aria-label="Delete expense"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
