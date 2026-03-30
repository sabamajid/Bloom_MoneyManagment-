"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/cn";

function navItems(showAccounts: boolean) {
  const core = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/expenses", label: "Expenses" },
  ] as const;
  const accounts = [{ href: "/accounts", label: "Accounts" }] as const;
  const tail = [
    { href: "/analytics", label: "Analytics" },
    { href: "/settings", label: "Settings" },
  ] as const;
  return showAccounts ? [...core, ...accounts, ...tail] : [...core, ...tail];
}

function greetingName(displayName: string | null | undefined, email: string) {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0];
  return local || "friend";
}

function initials(displayName: string | null | undefined, email: string) {
  const trimmed = displayName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

function navLinkClass(active: boolean) {
  return cn(
    "rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
    active
      ? "bg-white/95 text-ink shadow-sm ring-1 ring-fuchsia-200/90"
      : "text-ink/70 hover:bg-white/70 hover:text-ink",
  );
}

function mobileLinkClass(active: boolean) {
  return cn(
    "flex-1 rounded-2xl px-2 py-2 text-center text-sm font-semibold ring-1 transition",
    active
      ? "bg-white text-ink shadow-sm ring-fuchsia-200/90"
      : "bg-white/60 text-ink/75 ring-rose-100/80",
  );
}

export function Navbar({
  email,
  displayName,
  avatarUrl,
  showAccounts = true,
  className,
}: {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** Guests (household view role) — hide balances & account management. */
  showAccounts?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const mark = useMemo(() => initials(displayName, email), [displayName, email]);
  const hiName = useMemo(() => greetingName(displayName, email), [displayName, email]);
  const items = useMemo(() => navItems(showAccounts), [showAccounts]);

  function AvatarBadge() {
    const [avatarBroken, setAvatarBroken] = useState(false);
    const showAvatar = Boolean(avatarUrl && !avatarBroken);

    return (
      <div
        className={cn(
          "grid h-9 w-9 place-items-center overflow-hidden rounded-2xl ring-1 transition group-hover:-translate-y-0.5",
          showAvatar
            ? "bg-white ring-rose-100/90 shadow-[0_10px_28px_-18px_rgba(236,72,153,0.45)]"
            : "bg-gradient-to-br from-rose-300/90 via-fuchsia-300/80 to-violet-300/90 shadow-[0_14px_40px_-28px_rgba(236,72,153,0.75)] ring-white/70",
        )}
      >
        {showAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied URL; avoid remotePatterns config
          <img
            src={avatarUrl!}
            alt=""
            width={36}
            height={36}
            className="h-full w-full object-cover"
            onError={() => setAvatarBroken(true)}
          />
        ) : (
          <span className="text-[11px] font-black text-white">{mark}</span>
        )}
      </div>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/55 backdrop-blur-xl",
        "border-[var(--card-border)] shadow-[0_16px_44px_-40px_rgba(17,24,39,0.45)]",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/settings#profile"
            className="group relative shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-2xl"
            aria-label="Profile & avatar — open Settings"
            title="Edit profile"
          >
            {/* Key forces remount when avatarUrl changes so internal error state resets. */}
            <AvatarBadge key={avatarUrl ?? "no-avatar"} />
          </Link>
          <Link href="/dashboard" className="group min-w-0 leading-tight">
            <div className="text-sm font-semibold tracking-tight text-ink transition group-hover:text-ink/90">
              Bloom
            </div>
            <div className="text-[11px] text-ink/55">money management</div>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          {items.map(({ href, label }) => (
            <Link key={href} href={href} className={navLinkClass(pathname === href)}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden max-w-[220px] truncate rounded-2xl bg-white/55 px-3 py-2 text-xs font-semibold text-ink/70 ring-1 ring-rose-100/80 sm:block">
            Hi, <span className="text-ink">{hiName}</span>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl items-center gap-1.5 px-4 pb-3 sm:hidden sm:px-6">
        {items.map(({ href, label }) => (
          <Link key={href} href={href} className={mobileLinkClass(pathname === href)}>
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
