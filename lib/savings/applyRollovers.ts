import type { SupabaseClient } from "@supabase/supabase-js";

import { addMonthsUtc, monthBounds, monthKeyFromDate } from "@/lib/format";

function coerceAmount(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

async function getMonthlyLimitAmount(
  supabase: SupabaseClient,
  userId: string,
  monthKey: string,
): Promise<number | null> {
  const { data: row } = await supabase
    .from("monthly_limits")
    .select("limit_amount")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (row?.limit_amount != null) return coerceAmount(row.limit_amount);

  const { data: prof } = await supabase
    .from("user_profiles")
    .select("default_monthly_limit")
    .eq("user_id", userId)
    .maybeSingle();

  if (prof?.default_monthly_limit == null) return null;
  return coerceAmount(prof.default_monthly_limit);
}

async function earliestActivityMonth(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const candidates: string[] = [];

  const { data: fe } = await supabase
    .from("expenses")
    .select("spent_at")
    .eq("user_id", userId)
    .order("spent_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fe?.spent_at) {
    const mk = monthKeyFromDate(new Date(fe.spent_at as string));
    if (mk) candidates.push(mk);
  }

  const { data: fl } = await supabase
    .from("monthly_limits")
    .select("month_key")
    .eq("user_id", userId)
    .order("month_key", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fl?.month_key) candidates.push(fl.month_key as string);

  if (candidates.length === 0) return null;
  return candidates.sort()[0]!;
}

/**
 * Closes each past calendar month once: moves unspent budget (limit − budget spends) into savings ledger.
 * Idempotent via savings_month_closure.
 */
export async function applyMonthlySavingsRollovers(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const currentKey = monthKeyFromDate(new Date());
  const startKey = await earliestActivityMonth(supabase, userId);
  if (!startKey || startKey >= currentKey) return;

  let cursor = startKey;
  while (cursor < currentKey) {
    const { data: closure } = await supabase
      .from("savings_month_closure")
      .select("month_key")
      .eq("user_id", userId)
      .eq("month_key", cursor)
      .maybeSingle();

    if (!closure) {
      const limit = await getMonthlyLimitAmount(supabase, userId, cursor);
      if (limit == null || limit <= 0) {
        await supabase.from("savings_month_closure").insert({
          user_id: userId,
          month_key: cursor,
          rollover_amount: 0,
        });
      } else {
        const bounds = monthBounds(cursor);
        let spentBudget = 0;
        if (bounds) {
          const { data: expRows } = await supabase
            .from("expenses")
            .select("amount, spend_source")
            .eq("user_id", userId)
            .gte("spent_at", bounds.startIso)
            .lt("spent_at", bounds.endIso);

          for (const row of expRows ?? []) {
            const src = (row.spend_source as string | null) ?? "budget";
            if (src === "budget") spentBudget += coerceAmount(row.amount);
          }
        }

        const rollover = Math.max(0, Math.round((limit - spentBudget) * 100) / 100);

        const { error: closureErr } = await supabase.from("savings_month_closure").insert({
          user_id: userId,
          month_key: cursor,
          rollover_amount: rollover,
        });

        if (closureErr) {
          console.error("savings_month_closure", closureErr);
          cursor = addMonthsUtc(cursor, 1);
          continue;
        }

        if (rollover > 0) {
          const { error: ledgerErr } = await supabase.from("savings_ledger").insert({
            user_id: userId,
            entry_type: "monthly_rollover",
            amount: rollover,
            source_month: cursor,
            period_month: cursor,
            note: `Budget surplus for ${cursor}`,
          });
          if (ledgerErr) {
            console.error("savings_ledger rollover", ledgerErr);
            await supabase
              .from("savings_month_closure")
              .delete()
              .eq("user_id", userId)
              .eq("month_key", cursor);
          }
        }
      }
    }

    cursor = addMonthsUtc(cursor, 1);
  }
}
