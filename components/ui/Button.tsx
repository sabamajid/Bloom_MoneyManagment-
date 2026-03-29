import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 text-white shadow-[0_10px_28px_-16px_rgba(244,114,182,0.85)] hover:brightness-[1.04] active:brightness-[0.98]",
  secondary:
    "bg-white/75 text-ink shadow-sm ring-1 ring-[var(--soft-ring)] backdrop-blur hover:bg-white active:bg-white",
  ghost:
    "bg-transparent text-ink/80 hover:bg-white/60 active:bg-white/45",
  danger:
    "bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:bg-rose-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "gap-1.5 rounded-xl px-3 py-2 text-xs",
  md: "gap-2 rounded-2xl px-4 py-2.5 text-sm",
  lg: "gap-2 rounded-2xl px-5 py-3 text-sm",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center font-semibold tracking-tight transition will-change-transform",
    sizeClasses[size],
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "hover:-translate-y-0.5 active:translate-y-0 duration-200",
    variantClasses[variant],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
