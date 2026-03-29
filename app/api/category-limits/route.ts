import { NextResponse } from "next/server";

import { isValidCategoryName } from "@/lib/categories";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PUT(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = (await request.json()) as {
      categoryName?: unknown;
      limitAmount?: number | null;
    };

    if (!isValidCategoryName(body.categoryName)) {
      return jsonError("Invalid category name.", 400);
    }
    const categoryName = body.categoryName.trim();

    if (body.limitAmount === null) {
      const { error } = await supabase
        .from("category_limits")
        .delete()
        .eq("user_id", user.id)
        .eq("category_name", categoryName);
      if (error) return jsonError(error.message || "Could not clear category limit.", 500);
      return NextResponse.json({ categoryName, limitAmount: null });
    }

    if (
      typeof body.limitAmount !== "number" ||
      !Number.isFinite(body.limitAmount) ||
      body.limitAmount <= 0
    ) {
      return jsonError("limitAmount must be a positive number or null.", 400);
    }

    const normalized = Math.round(body.limitAmount * 100) / 100;
    const { data, error } = await supabase
      .from("category_limits")
      .upsert(
        {
          user_id: user.id,
          category_name: categoryName,
          limit_amount: normalized,
        },
        { onConflict: "user_id,category_name" },
      )
      .select("category_name,limit_amount")
      .single();

    if (error) return jsonError(error.message || "Could not save category limit.", 500);
    return NextResponse.json({ categoryName: data.category_name, limitAmount: data.limit_amount });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
