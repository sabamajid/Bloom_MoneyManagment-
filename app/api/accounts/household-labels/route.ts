import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Read-only id → name map for any cash account visible in the same household (for expense labels). */
export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { data, error } = await supabase
      .from("user_accounts")
      .select("id, name, user_id")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return jsonError("Could not load account labels.", 500);
    }

    return NextResponse.json({ accounts: data ?? [] });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
