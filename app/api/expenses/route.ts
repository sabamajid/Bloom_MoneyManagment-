import { NextResponse } from "next/server";

import { monthBounds, monthKeyFromDate } from "@/lib/format";
import { applyMonthlySavingsRollovers } from "@/lib/savings/applyRollovers";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { parseCreateExpenseInput } from "@/lib/validation/expense";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const month = searchParams.get("month");

    let query = supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (category && category !== "all") query = query.eq("category", category);
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) return jsonError("Invalid month format. Use YYYY-MM.", 400);
      const bounds = monthBounds(month);
      if (!bounds) return jsonError("Invalid month format. Use YYYY-MM.", 400);
      query = query.gte("date", bounds.startIso).lt("date", bounds.endIso);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return jsonError("Could not load expenses.", 500);
    }

    return NextResponse.json({ expenses: data ?? [] });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    await applyMonthlySavingsRollovers(supabase, user.id);

    const json = (await request.json()) as unknown;
    const parsed = parseCreateExpenseInput(json);
    if (!parsed.ok) return jsonError(parsed.message, 400);

    const { amount, category, date, note, accountId, spendSource } = parsed.value;

    if (spendSource === "budget") {
      const { data: accRow, error: accErr } = await supabase
        .from("user_accounts")
        .select("id")
        .eq("id", accountId as string)
        .eq("user_id", user.id)
        .maybeSingle();

      if (accErr) {
        console.error(accErr);
        return jsonError(accErr.message || "Could not validate account.", 500);
      }
      if (!accRow) {
        return jsonError("Invalid or unknown account.", 400);
      }
    }

    const { data: customRows, error: customError } = await supabase
      .from("user_categories")
      .select("name")
      .eq("user_id", user.id);
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

    if (spendSource === "savings") {
      const { data: savingsRows } = await supabase
        .from("savings_ledger")
        .select("amount")
        .eq("user_id", user.id);

      let bal = 0;
      for (const r of savingsRows ?? []) {
        const raw = r.amount;
        const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
        if (Number.isFinite(n)) bal += n;
      }
      bal = Math.round(bal * 100) / 100;
      if (amount > bal + 1e-6) {
        return jsonError("Not enough in savings for this amount.", 400);
      }
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        amount,
        category,
        date,
        note,
        spend_source: spendSource,
        account_id: spendSource === "budget" ? accountId : null,
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not create expense.", 500);
    }

    if (spendSource === "savings" && data?.id) {
      const periodMonth = monthKeyFromDate(new Date(date));
      const { error: ledgerErr } = await supabase.from("savings_ledger").insert({
        user_id: user.id,
        entry_type: "spend_from_savings",
        amount: -amount,
        source_month: null,
        period_month: periodMonth,
        expense_id: data.id as string,
        note: category,
      });

      if (ledgerErr) {
        console.error(ledgerErr);
        await supabase.from("expenses").delete().eq("id", data.id).eq("user_id", user.id);
        return jsonError(ledgerErr.message || "Could not record savings spend.", 500);
      }
    }

    return NextResponse.json({ expense: data });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
