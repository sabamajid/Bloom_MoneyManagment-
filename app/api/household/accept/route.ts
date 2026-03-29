import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const json = (await request.json()) as { token?: string };
    const token = String(json.token ?? "").trim();
    if (!token) return jsonError("Invite token required.", 400);

    const { data, error } = await supabase.rpc("accept_household_invite", {
      invite_token: token,
    });

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not accept invite.", 500);
    }

    const result = data as { ok?: boolean; error?: string; alreadyMember?: boolean } | null;
    if (!result?.ok) {
      return jsonError(result?.error ?? "Could not accept invite.", 400);
    }

    return NextResponse.json({ ok: true, alreadyMember: Boolean(result.alreadyMember) });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
