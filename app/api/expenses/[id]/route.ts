import { NextResponse } from "next/server";

import { isExpenseEditable } from "@/lib/expenseEditWindow";
import { monthKeyFromDate } from "@/lib/format";
import { ensureHouseholdAccess } from "@/lib/household/access";
import { applyMonthlySavingsRollovers } from "@/lib/savings/applyRollovers";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { parseCreateExpenseInput } from "@/lib/validation/expense";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function sumSavingsLedger(
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>,
  userId: string,
): Promise<number> {
  const { data: savingsRows } = await supabase
    .from("savings_ledger")
    .select("amount")
    .eq("user_id", userId);

  let bal = 0;
  for (const r of savingsRows ?? []) {
    const raw = r.amount;
    const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    if (Number.isFinite(n)) bal += n;
  }
  return Math.round(bal * 100) / 100;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) return jsonError("Missing expense id.", 400);

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    const access = await ensureHouseholdAccess(supabase);
    if (!access) return jsonError("Could not load household.", 500);
    if (!access.canWriteExpenses) {
      return jsonError("You have view-only access and cannot edit transactions.", 403);
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error(fetchErr);
      return jsonError("Could not load expense.", 500);
    }
    if (!existing) {
      return jsonError("Expense not found.", 404);
    }

    const ownerId = existing.user_id as string;
    await applyMonthlySavingsRollovers(supabase, ownerId);

    const createdAt = existing.created_at as string | undefined;
    if (!isExpenseEditable(createdAt)) {
      return jsonError(
        "This transaction can no longer be edited (over 24 hours since it was added).",
        403,
      );
    }

    const json = (await request.json()) as unknown;
    const parsed = parseCreateExpenseInput(json);
    if (!parsed.ok) return jsonError(parsed.message, 400);

    const { amount, category, date, note, accountId, spendSource } = parsed.value;
    const wasSavings = (existing.spend_source ?? "budget") === "savings";
    const willSavings = spendSource === "savings";

    const { data: customRows, error: customError } = await supabase
      .from("user_categories")
      .select("name")
      .eq("user_id", ownerId);

    if (customError) {
      console.error(customError);
      return jsonError(customError.message || "Could not validate category.", 500);
    }

    const allowed = new Set<string>();
    for (const row of customRows ?? []) {
      if (row?.name) allowed.add(row.name);
    }
    if (!allowed.has(category)) {
      return jsonError("Add this category in Settings first.", 400);
    }

    if (spendSource === "budget") {
      const { data: accRow, error: accErr } = await supabase
        .from("user_accounts")
        .select("id")
        .eq("id", accountId as string)
        .eq("user_id", ownerId)
        .maybeSingle();
      if (accErr) {
        console.error(accErr);
        return jsonError(accErr.message || "Could not validate account.", 500);
      }
      if (!accRow) {
        return jsonError("Invalid or unknown account.", 400);
      }
    }

    if (wasSavings) {
      const { error: delLedErr } = await supabase
        .from("savings_ledger")
        .delete()
        .eq("expense_id", id)
        .eq("user_id", ownerId);
      if (delLedErr) {
        console.error(delLedErr);
        return jsonError(delLedErr.message || "Could not update savings history.", 500);
      }
    }

    if (willSavings) {
      const bal = await sumSavingsLedger(supabase, ownerId);
      if (amount > bal + 1e-6) {
        if (wasSavings) {
          const oldAmount =
            typeof existing.amount === "number"
              ? existing.amount
              : Number.parseFloat(String(existing.amount));
          const periodMonth = monthKeyFromDate(new Date(existing.spent_at as string));
          await supabase.from("savings_ledger").insert({
            user_id: ownerId,
            entry_type: "spend_from_savings",
            amount: Number.isFinite(oldAmount) ? -oldAmount : 0,
            source_month: null,
            period_month: periodMonth,
            expense_id: id,
            note: existing.category as string,
          });
        }
        return jsonError("Not enough in savings for this amount.", 400);
      }
    }

    const { data: updated, error: upErr } = await supabase
      .from("expenses")
      .update({
        amount,
        category,
        spent_at: date,
        note,
        spend_source: spendSource,
        account_id: spendSource === "budget" ? accountId : null,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (upErr) {
      console.error(upErr);
      return jsonError(upErr.message || "Could not update expense.", 500);
    }
    if (!updated) {
      return jsonError("Expense not found.", 404);
    }

    if (willSavings) {
      const periodMonth = monthKeyFromDate(new Date(date));
      const { error: ledgerErr } = await supabase.from("savings_ledger").insert({
        user_id: ownerId,
        entry_type: "spend_from_savings",
        amount: -amount,
        source_month: null,
        period_month: periodMonth,
        expense_id: id,
        note: category,
      });
      if (ledgerErr) {
        console.error(ledgerErr);
        await supabase
          .from("expenses")
          .update({
            amount: existing.amount,
            category: existing.category,
            spent_at: existing.spent_at,
            note: existing.note,
            spend_source: existing.spend_source ?? "budget",
            account_id: existing.account_id ?? null,
          })
          .eq("id", id);
        if (wasSavings) {
          const oldAmount =
            typeof existing.amount === "number"
              ? existing.amount
              : Number.parseFloat(String(existing.amount));
          const oldPeriod = monthKeyFromDate(new Date(existing.spent_at as string));
          await supabase.from("savings_ledger").insert({
            user_id: ownerId,
            entry_type: "spend_from_savings",
            amount: Number.isFinite(oldAmount) ? -oldAmount : 0,
            source_month: null,
            period_month: oldPeriod,
            expense_id: id,
            note: existing.category as string,
          });
        }
        return jsonError(ledgerErr.message || "Could not record savings spend.", 500);
      }
    }

    return NextResponse.json({ expense: updated });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) return jsonError("Missing expense id.", 400);

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    const access = await ensureHouseholdAccess(supabase);
    if (!access) return jsonError("Could not load household.", 500);
    if (!access.canWriteExpenses) {
      return jsonError("You have view-only access and cannot delete transactions.", 403);
    }

    const { data: row, error: fetchErr } = await supabase
      .from("expenses")
      .select("id, created_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error(fetchErr);
      return jsonError("Could not load expense.", 500);
    }
    if (!row) {
      return jsonError("Expense not found.", 404);
    }

    if (!isExpenseEditable(row.created_at as string | undefined)) {
      return jsonError(
        "This transaction can no longer be deleted (over 24 hours since it was added).",
        403,
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not delete expense.", 500);
    }

    if (!data) {
      return jsonError("Expense not found.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
