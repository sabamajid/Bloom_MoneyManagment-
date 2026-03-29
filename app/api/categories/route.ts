import { NextResponse } from "next/server";

import { isValidCategoryName } from "@/lib/categories";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const [{ data: customRows, error: customError }, { data: limitRows, error: limitsError }] =
      await Promise.all([
        supabase.from("user_categories").select("id,name").eq("user_id", user.id),
        supabase.from("category_limits").select("category_name,limit_amount").eq("user_id", user.id),
      ]);

    if (customError) return jsonError(customError.message || "Could not load categories.", 500);
    if (limitsError) return jsonError(limitsError.message || "Could not load categories.", 500);

    const limitMap = new Map<string, number | string>();
    for (const row of limitRows ?? []) {
      if (row?.category_name) limitMap.set(row.category_name, row.limit_amount);
    }

    const categories = (customRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      limitAmount: limitMap.get(row.name) ?? null,
    }));

    return NextResponse.json({ categories });
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

    const body = (await request.json()) as { name?: unknown };
    if (!isValidCategoryName(body.name)) return jsonError("Category name must be 2-40 characters.", 400);
    const name = body.name.trim();

    const { data, error } = await supabase
      .from("user_categories")
      .insert({ user_id: user.id, name })
      .select("id,name")
      .single();
    if (error) return jsonError(error.message || "Could not add category.", 500);

    return NextResponse.json({ category: data });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
