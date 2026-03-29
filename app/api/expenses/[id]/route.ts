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
    if (!id) return jsonError("Missing expense id.", 400);

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    const { data, error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
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
