import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import type { AccountWithBalance } from "@/types/account";
import { parseCreateAccountInput } from "@/lib/validation/account";

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

    const [accountsRes, expensesRes] = await Promise.all([
      supabase.from("user_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("expenses").select("account_id, amount").eq("user_id", user.id).not("account_id", "is", null),
    ]);

    if (accountsRes.error) {
      console.error(accountsRes.error);
      return jsonError("Could not load accounts.", 500);
    }
    if (expensesRes.error) {
      console.error(expensesRes.error);
      return jsonError("Could not load expenses.", 500);
    }

    const spentByAccount = new Map<string, number>();
    for (const row of expensesRes.data ?? []) {
      const aid = row.account_id as string | null;
      if (!aid) continue;
      spentByAccount.set(aid, (spentByAccount.get(aid) ?? 0) + coerceAmount(row.amount));
    }

    const accounts: AccountWithBalance[] = (accountsRes.data ?? []).map((row) => {
      const id = row.id as string;
      const spent = spentByAccount.get(id) ?? 0;
      const opening = coerceAmount(row.opening_balance);
      return {
        id,
        name: row.name as string,
        opening_balance: opening,
        spent,
        balance: Math.round((opening - spent) * 100) / 100,
      };
    });

    return NextResponse.json({ accounts });
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

    const json = (await request.json()) as unknown;
    const parsed = parseCreateAccountInput(json);
    if (!parsed.ok) return jsonError(parsed.message, 400);

    const { name, opening_balance } = parsed.value;

    const { data, error } = await supabase
      .from("user_accounts")
      .insert({
        user_id: user.id,
        name,
        kind: "account",
        opening_balance,
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not create account.", 500);
    }

    return NextResponse.json({ account: data });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
