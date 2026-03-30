import { NextResponse } from "next/server";

import { ensureHouseholdAccess } from "@/lib/household/access";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import type { HouseholdRole } from "@/types/household";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetUserId } = await context.params;
    if (!targetUserId) return jsonError("Member required.", 400);

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return jsonError("Unauthorized", 401);

    const access = await ensureHouseholdAccess(supabase);
    if (!access?.canInvite) return jsonError("Only the household admin can edit members.", 403);

    const body = (await request.json()) as { role?: string };
    const roleRaw = body.role === "full" ? "full" : body.role === "view" ? "view" : null;
    if (!roleRaw) return jsonError("Role must be guest or full.", 400);

    const { data: target, error: tErr } = await supabase
      .from("household_members")
      .select("user_id, role, household_id")
      .eq("household_id", access.householdId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (tErr || !target) return jsonError("Member not found.", 404);

    if (target.role === "admin") {
      return jsonError("The household admin role cannot be changed here.", 400);
    }

    if (targetUserId === user.id) {
      return jsonError("You cannot change your own role.", 400);
    }

    const { error: uErr } = await supabase
      .from("household_members")
      .update({ role: roleRaw })
      .eq("household_id", access.householdId)
      .eq("user_id", targetUserId);

    if (uErr) {
      console.error(uErr);
      return jsonError(uErr.message || "Could not update member.", 500);
    }

    return NextResponse.json({ ok: true, role: roleRaw as HouseholdRole });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetUserId } = await context.params;
    if (!targetUserId) return jsonError("Member required.", 400);

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return jsonError("Unauthorized", 401);

    const access = await ensureHouseholdAccess(supabase);
    if (!access?.canInvite) return jsonError("Only the household admin can remove members.", 403);

    const { data, error } = await supabase.rpc("admin_detach_household_member", {
      p_target_user_id: targetUserId,
    });

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not remove member.", 500);
    }

    const result = data as { ok?: boolean; error?: string } | null;
    if (!result?.ok) {
      return jsonError(result?.error ?? "Could not remove member.", 400);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
