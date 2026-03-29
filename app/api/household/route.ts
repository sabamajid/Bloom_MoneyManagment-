import { NextResponse } from "next/server";

import { ensureHouseholdAccess } from "@/lib/household/access";
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
    if (!user?.id) return jsonError("Unauthorized", 401);

    const access = await ensureHouseholdAccess(supabase);
    if (!access) return jsonError("Unauthorized", 401);

    const { data: members, error: memErr } = await supabase
      .from("household_members")
      .select("user_id, role, joined_at")
      .eq("household_id", access.householdId)
      .order("joined_at", { ascending: true });

    if (memErr) {
      console.error(memErr);
      return jsonError("Could not load members.", 500);
    }

    const ids = (members ?? []).map((m) => m.user_id as string);
    const profileByUser: Record<string, string | null> = {};
    if (ids.length) {
      const { data: prows, error: pErr } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      if (pErr) {
        console.error(pErr);
      }
      for (const p of prows ?? []) {
        profileByUser[p.user_id as string] = (p.display_name as string | null) ?? null;
      }
    }

    let invites: Array<{
      id: string;
      email: string;
      role: string;
      expires_at: string;
      created_at: string;
    }> = [];

    if (access.canInvite) {
      const { data: inv, error: invErr } = await supabase
        .from("household_invites")
        .select("id, email, role, expires_at, created_at")
        .eq("household_id", access.householdId)
        .order("created_at", { ascending: false });

      if (invErr) {
        console.error(invErr);
      } else {
        invites = (inv ?? []) as typeof invites;
      }
    }

    return NextResponse.json({
      selfUserId: user.id,
      householdId: access.householdId,
      role: access.role,
      canWriteExpenses: access.canWriteExpenses,
      canInvite: access.canInvite,
      members: (members ?? []).map((m) => ({
        user_id: m.user_id as string,
        role: m.role,
        joined_at: m.joined_at as string,
        display_name: profileByUser[m.user_id as string] ?? null,
      })),
      invites,
    });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
