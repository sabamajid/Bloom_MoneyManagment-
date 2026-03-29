import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { data, error } = await supabase
      .from("user_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("name")
      .maybeSingle();

    if (error) return jsonError(error.message || "Could not delete category.", 500);
    if (!data) return jsonError("Category not found.", 404);

    await supabase
      .from("category_limits")
      .delete()
      .eq("user_id", user.id)
      .eq("category_name", data.name);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
