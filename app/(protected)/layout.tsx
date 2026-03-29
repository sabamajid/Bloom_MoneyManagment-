import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileRow, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(profileError);
  }

  const profile = !profileError
    ? (profileRow as { display_name: string | null; avatar_url: string | null } | null)
    : null;

  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar
        email={user.email ?? "friend"}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">{children}</main>
    </div>
  );
}
