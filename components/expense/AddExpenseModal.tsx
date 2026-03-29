"use client";

import { Modal } from "@/components/ui/Modal";
import type { Expense } from "@/types/expense";

import { ExpenseForm } from "./ExpenseForm";

export function AddExpenseModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (expense: Expense) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Add transaction"
    >
      <ExpenseForm
        onCancel={() => onOpenChange(false)}
        onCreated={(expense) => {
          onCreated(expense);
          onOpenChange(false);
        }}
      />
    </Modal>
  );
}
