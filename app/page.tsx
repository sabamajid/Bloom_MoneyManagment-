import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,182,193,0.55),transparent_60%)] blur-2xl" />
        <div className="absolute right-[-140px] top-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(196,181,253,0.55),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-180px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(253,230,138,0.35),transparent_62%)] blur-2xl" />
      </div>

      <main className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/65 px-3 py-1 text-xs font-semibold text-ink/60 ring-1 ring-rose-100/80 shadow-sm">
              Pastel finance, human-sized habits
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Bloom Money Management
            </h1>
            <p className="mt-4 max-w-prose text-base leading-relaxed text-ink/65">
              A modern personal expense tracker with clean cards, fast actions, and useful
              insights.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className={buttonVariants({
                  variant: "primary",
                  className: "w-full justify-center sm:w-auto",
                })}
              >
                Start free
              </Link>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "secondary",
                  className: "w-full justify-center sm:w-auto",
                })}
              >
                I already have an account
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Cute clarity",
                  body: "Monthly totals + recent activity, without overwhelm.",
                },
                {
                  title: "Pretty categories",
                  body: "Icons and swatches that make receipts feel lighter.",
                },
                {
                  title: "Private by default",
                  body: "Your data stays behind Supabase Auth + row-level security.",
                },
              ].map((item) => (
                <Card key={item.title} className="p-4">
                  <div className="text-sm font-semibold text-ink">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{item.body}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden p-6 lg:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-white/10 to-fuchsia-200/25" />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink/70">Preview</div>
                <div className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-ink/60 ring-1 ring-rose-100/80">
                  March
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-3xl bg-white/75 p-4 ring-1 ring-rose-100/80 shadow-sm">
                  <div className="text-xs font-semibold text-ink/55">Monthly spending</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                    PKR 248.00
                  </div>
                  <div className="mt-2 text-sm text-ink/55">Current month overview</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-gradient-to-br from-rose-200/70 via-fuchsia-200/55 to-violet-200/65 p-4 text-rose-950 ring-1 ring-white/70 shadow-sm">
                    <div className="text-xs font-semibold opacity-80">Food</div>
                    <div className="mt-2 text-xl font-semibold tracking-tight">PKR 42.18</div>
                    <div className="mt-2 text-xs font-semibold opacity-70">Groceries + a treat</div>
                  </div>
                  <div className="rounded-3xl bg-white/75 p-4 ring-1 ring-rose-100/80 shadow-sm">
                    <div className="text-xs font-semibold text-ink/55">Baby</div>
                    <div className="mt-2 text-xl font-semibold tracking-tight text-ink">
                      PKR 63.40
                    </div>
                    <div className="mt-2 text-xs text-ink/55">Tiny essentials</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
