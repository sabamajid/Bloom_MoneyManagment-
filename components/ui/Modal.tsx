"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/15 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-end justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/80",
            "bg-white/85 shadow-[0_30px_120px_-60px_rgba(109,40,217,0.75)] backdrop-blur-2xl",
            "transition duration-200",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-rose-100/80 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-ink">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-ink/60">{description}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl px-2.5 py-2"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
