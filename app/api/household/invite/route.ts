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

    const json = (await request.json()) as { email?: string; access?: string; role?: string };
    const emailRaw = String(json.email ?? "").trim().toLowerCase();
    if (!emailRaw || !emailRaw.includes("@")) {
      return jsonError("Enter a valid email address.", 400);
    }

    const accessLevel = json.access ?? json.role ?? "view";
    const inviteRole = accessLevel === "full" ? "full" : "view";

    const { data, error } = await supabase
      .from("household_invites")
      .insert({
        household_id: access.householdId,
        email: emailRaw,
        role: inviteRole,
        invited_by: user.id,
      })
      .select("id, token, email, role, expires_at")
      .maybeSingle();

    if (error) {
      console.error(error);
      if (error.code === "23505") {
        return jsonError("An invite for this email is already pending.", 409);
      }
      return jsonError(error.message || "Could not create invite.", 500);
    }

    if (!data) return jsonError("Could not create invite.", 500);

    return NextResponse.json({ invite: data });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
