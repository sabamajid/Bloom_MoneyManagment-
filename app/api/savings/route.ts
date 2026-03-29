import { NextResponse } from "next/server";

import { formatUtcMonthKeyLong } from "@/lib/format";
import { applyMonthlySavingsRollovers } from "@/lib/savings/applyRollovers";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import type { SavingsLedgerEntry, SavingsMonthlyBreakdown } from "@/types/savings";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function coerceAmount(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    await applyMonthlySavingsRollovers(supabase, user.id);

    const { data: rows, error } = await supabase
      .from("savings_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return jsonError("Could not load savings.", 500);
    }

    const ledger = (rows ?? []) as SavingsLedgerEntry[];

    let totalSaved = 0;
    for (const row of ledger) {
      totalSaved += coerceAmount(row.amount);
    }
    totalSaved = Math.round(totalSaved * 100) / 100;

    const monthAgg = new Map<string, { rolloverIn: number; spentFromSavings: number }>();
    for (const row of ledger) {
      const pm = row.period_month;
      if (!monthAgg.has(pm)) {
        monthAgg.set(pm, { rolloverIn: 0, spentFromSavings: 0 });
      }
      const b = monthAgg.get(pm)!;
      const amt = coerceAmount(row.amount);
      if (row.entry_type === "monthly_rollover") {
        b.rolloverIn += amt;
      } else {
        b.spentFromSavings += -amt;
      }
    }

    const monthlyBreakdown: SavingsMonthlyBreakdown[] = [...monthAgg.entries()]
      .map(([monthKey, v]) => ({
        monthKey,
        rolloverIn: Math.round(v.rolloverIn * 100) / 100,
        spentFromSavings: Math.round(v.spentFromSavings * 100) / 100,
        net: Math.round((v.rolloverIn - v.spentFromSavings) * 100) / 100,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    const ledgerWithLabels = ledger.map((row) => ({
      ...row,
      title:
        row.entry_type === "monthly_rollover"
          ? `Budget surplus · ${formatUtcMonthKeyLong(row.period_month)}`
          : `Spent from savings · ${formatUtcMonthKeyLong(row.period_month)}`,
    }));

    return NextResponse.json({
      balance: totalSaved,
      monthlyBreakdown,
      ledger: ledgerWithLabels,
    });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
