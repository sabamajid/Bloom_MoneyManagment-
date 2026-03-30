import type { SupabaseClient } from "@supabase/supabase-js";

import type { HouseholdAccess } from "@/lib/household/access";

/** Monthly/category budget rows for the dashboard follow the household admin for guests. */
export async function budgetOwnerUserId(
  supabase: SupabaseClient,
  access: HouseholdAccess | null,
  selfUserId: string,
): Promise<string> {
  if (!access || access.role !== "view") return selfUserId;
  const { data } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", access.householdId)
    .eq("role", "admin")
    .maybeSingle();
  const adminId = data?.user_id as string | undefined;
  return adminId ?? selfUserId;
}
