"use client";

import { TransactionModal } from "@/components/expense/TransactionModal";

export function AddExpenseModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  return (
    <TransactionModal
      state={open ? { type: "add" } : null}
      onClose={() => onOpenChange(false)}
      onFinished={() => {
        onCreated();
      }}
    />
  );
}
