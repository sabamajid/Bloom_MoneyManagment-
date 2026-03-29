import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Consistent page title row: optional badge, heading, subtitle, optional primary action (right).
 */
export function PageHeader({ title, description, badge, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-rose-100/50 sm:flex-row sm:items-start sm:justify-between",
        description ? "pb-8" : "pb-6",
        className,
      )}
    >
      <div className={cn("min-w-0", description ? "space-y-3" : "space-y-2")}>
        {badge ? <div className="flex flex-wrap items-center gap-2">{badge}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-ink/60">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:pt-0.5">{action}</div> : null}
    </div>
  );
}
