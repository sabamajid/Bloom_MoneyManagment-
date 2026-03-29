import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const sp = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-3xl bg-gradient-to-br from-rose-300/90 via-fuchsia-300/80 to-violet-300/90 shadow-[0_18px_55px_-34px_rgba(236,72,153,0.75)] ring-1 ring-white/70">
            <span className="text-sm font-black text-white">B</span>
          </div>
          <div className="text-left leading-tight">
            <div className="text-sm font-semibold tracking-tight text-ink">Bloom</div>
            <div className="text-[11px] text-ink/55">welcome back</div>
          </div>
        </Link>
      </div>

      <Card className="p-6">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink/60">
          Sign in to continue managing your expenses.
        </p>

        <div className="mt-6">
          <LoginForm authCallbackFailed={sp.error === "auth"} />
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-ink/50">
        By continuing, you agree to take care of your future self (and your budget).
      </p>
    </div>
  );
}
