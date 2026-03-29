import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: string;
  /** Extra node beside title (e.g. link) */
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Vertical rhythm: optional heading block + consistent gap before children (16px / 24px scale).
 */
export function Section({ title, description, action, children, className, ...rest }: Props) {
  const hasHead = Boolean(title || description || action);

  return (
    <section className={cn("space-y-4", className)} {...rest}>
      {hasHead ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</h2>
            ) : null}
            {description ? <p className="max-w-2xl text-sm text-ink/55">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
