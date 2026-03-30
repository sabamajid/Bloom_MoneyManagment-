import { NextResponse } from "next/server";

import { monthKeyFromDate } from "@/lib/format";
import { ensureHouseholdAccess } from "@/lib/household/access";
import { budgetOwnerUserId } from "@/lib/household/budgetOwner";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function resolveMonthKey(raw: string | null) {
  if (!raw) return monthKeyFromDate(new Date());
  if (!/^\d{4}-\d{2}$/.test(raw)) return null;
  return raw;
}

export async function GET(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const monthKey = resolveMonthKey(new URL(request.url).searchParams.get("month"));
    if (!monthKey) return jsonError("Invalid month format. Use YYYY-MM.", 400);

    const access = await ensureHouseholdAccess(supabase);
    const budgetUserId = await budgetOwnerUserId(supabase, access, user.id);

    const { data, error } = await supabase
      .from("monthly_limits")
      .select("limit_amount")
      .eq("user_id", budgetUserId)
      .eq("month_key", monthKey)
      .maybeSingle();

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not load monthly limit.", 500);
    }

    if (data?.limit_amount != null) {
      return NextResponse.json({
        monthKey,
        limitAmount: data.limit_amount,
        source: "month",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("default_monthly_limit")
      .eq("user_id", budgetUserId)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      return jsonError(profileError.message || "Could not load budget default.", 500);
    }

    return NextResponse.json({
      monthKey,
      limitAmount: profile?.default_monthly_limit ?? null,
      source: profile?.default_monthly_limit != null ? "default" : null,
    });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const access = await ensureHouseholdAccess(supabase);
    if (access?.role === "view") {
      return jsonError("Guests cannot change the household budget. Ask your admin.", 403);
    }

    const body = (await request.json()) as {
      month?: string | null;
      limitAmount?: number;
    };

    const limitAmount = body.limitAmount;
    if (typeof limitAmount !== "number" || !Number.isFinite(limitAmount) || limitAmount <= 0) {
      return jsonError("limitAmount must be a positive number.", 400);
    }

    const normalized = Math.round(limitAmount * 100) / 100;

    const hasExplicitMonth =
      body.month !== undefined && body.month !== null && String(body.month).trim() !== "";

    if (hasExplicitMonth) {
      const monthKey = resolveMonthKey(String(body.month));
      if (!monthKey) return jsonError("Invalid month format. Use YYYY-MM.", 400);

      const { data, error: updateError } = await supabase
        .from("monthly_limits")
        .upsert(
          { user_id: user.id, month_key: monthKey, limit_amount: normalized },
          { onConflict: "user_id,month_key" },
        )
        .select("month_key, limit_amount")
        .single();

      if (updateError) {
        console.error(updateError);
        return jsonError(updateError.message || "Could not save monthly limit.", 500);
      }

      return NextResponse.json({
        monthKey: data.month_key,
        limitAmount: data.limit_amount,
        source: "month",
      });
    }

    const { data: prof, error: profLoadErr } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url, default_monthly_limit")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profLoadErr) {
      console.error(profLoadErr);
      return jsonError(profLoadErr.message || "Could not load profile.", 500);
    }

    const { error: upsertErr } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        display_name: prof?.display_name ?? null,
        avatar_url: prof?.avatar_url ?? null,
        default_monthly_limit: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertErr) {
      console.error(upsertErr);
      return jsonError(upsertErr.message || "Could not save budget.", 500);
    }

    return NextResponse.json({
      limitAmount: normalized,
      source: "default",
    });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
