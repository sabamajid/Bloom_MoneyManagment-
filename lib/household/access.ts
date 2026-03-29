import type { SupabaseClient } from "@supabase/supabase-js";

import type { HouseholdRole } from "@/types/household";

export type HouseholdAccess = {
  householdId: string;
  role: HouseholdRole;
  canWriteExpenses: boolean;
  canInvite: boolean;
};

/**
 * Ensures the user has a household row, backfills expense.household_id, returns access flags.
 */
export async function ensureHouseholdAccess(
  supabase: SupabaseClient,
): Promise<HouseholdAccess | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: hidRaw, error: rpcErr } = await supabase.rpc("create_default_household");
  if (rpcErr) {
    console.error("create_default_household", rpcErr);
    return null;
  }

  const householdId = typeof hidRaw === "string" ? hidRaw : String(hidRaw ?? "");
  if (!householdId) return null;

  const { data: mem, error: memErr } = await supabase
    .from("household_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    console.error(memErr);
    return null;
  }

  const role = (mem?.role as HouseholdRole | undefined) ?? "admin";
  const canWriteExpenses = role === "admin" || role === "full";
  const canInvite = role === "admin";

  return { householdId, role, canWriteExpenses, canInvite };
}
