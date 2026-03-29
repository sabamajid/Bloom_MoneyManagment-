import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Card, CardKicker, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const toneIcon: Record<"rose" | "violet" | "emerald", string> = {
  rose: "bg-rose-100/85 text-rose-700 ring-rose-200/70",
  violet: "bg-violet-100/85 text-violet-700 ring-violet-200/70",
  emerald: "bg-emerald-100/85 text-emerald-700 ring-emerald-200/70",
};

type Props = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  kicker: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof toneIcon;
  footer?: ReactNode;
};

export function StatCard({ kicker, value, icon: Icon, tone = "rose", footer, className, ...rest }: Props) {
  return (
    <Card variant="interactive" className={cn("h-full p-5 sm:p-6", className)} {...rest}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardKicker>{kicker}</CardKicker>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </CardTitle>
        </div>
        <div
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1",
            toneIcon[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      {footer ? <p className="mt-4 text-xs font-medium text-ink/50">{footer}</p> : null}
    </Card>
  );
}
