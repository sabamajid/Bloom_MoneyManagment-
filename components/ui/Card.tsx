import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type CardVariant = "interactive" | "quiet";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** interactive: lift + shadow on hover (hero / stat cards). quiet: subtle shadow, no lift (lists, dense UI). */
  variant?: CardVariant;
};

export function Card({ className, variant = "interactive", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[26px] border bg-[var(--card-bg)] p-5 shadow-[var(--soft-shadow)] backdrop-blur-xl",
        "border-[var(--card-border)]",
        variant === "interactive" &&
          "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-52px_rgba(236,72,153,0.65)]",
        variant === "quiet" &&
          "shadow-sm transition-shadow duration-200 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold tracking-tight text-ink/80", className)}
      {...props}
    />
  );
}

export function CardKicker({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs font-medium tracking-wide text-ink/55", className)}
      {...props}
    />
  );
}
