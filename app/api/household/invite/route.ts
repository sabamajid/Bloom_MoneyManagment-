import { NextResponse } from "next/server";

import { ensureHouseholdAccess } from "@/lib/household/access";
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
    if (!user?.id) return jsonError("Unauthorized", 401);

    const access = await ensureHouseholdAccess(supabase);
    if (!access?.canInvite) return jsonError("Only household admins can send invites.", 403);

    const json = (await request.json()) as { access?: string; role?: string };
    const accessLevel = json.access ?? json.role ?? "view";
    const inviteRole = accessLevel === "full" ? "full" : "view";

    const { error: delErr } = await supabase
      .from("household_invites")
      .delete()
      .eq("household_id", access.householdId);

    if (delErr) {
      console.error(delErr);
      return jsonError("Could not reset invite link.", 500);
    }

    const { data, error } = await supabase
      .from("household_invites")
      .insert({
        household_id: access.householdId,
        email: null,
        role: inviteRole,
        invited_by: user.id,
      })
      .select("id, token, role, expires_at, created_at")
      .maybeSingle();

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not create invite.", 500);
    }

    if (!data) return jsonError("Could not create invite.", 500);

    return NextResponse.json({ invite: data });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
