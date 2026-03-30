import { redirect } from "next/navigation";

import { AccountsClient } from "@/components/accounts/AccountsClient";
import { ensureHouseholdAccess } from "@/lib/household/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();
  const access = await ensureHouseholdAccess(supabase);
  if (access?.role === "view") redirect("/dashboard");

  return <AccountsClient />;
}
