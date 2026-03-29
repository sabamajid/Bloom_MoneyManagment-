import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function Input({
  className,
  id,
  label,
  hint,
  ...rest
}: Props) {
  return (
    <div className={cn("w-full")}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink/70">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={cn(
          "w-full rounded-2xl border border-rose-100/90 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none",
          "placeholder:text-ink/35",
          "focus:border-violet-200 focus:ring-2 focus:ring-violet-200/60",
          className,
        )}
        {...rest}
      />
      {hint ? <p className="mt-1.5 text-xs text-ink/55">{hint}</p> : null}
    </div>
  );
}
