"use client";

import { Modal } from "@/components/ui/Modal";
import type { Expense } from "@/types/expense";

import { ExpenseForm } from "./ExpenseForm";

export type TransactionModalState = { type: "add" } | { type: "edit"; expense: Expense };

export function TransactionModal({
  state,
  onClose,
  onFinished,
}: {
  state: TransactionModalState | null;
  onClose: () => void;
  onFinished: () => void;
}) {
  const open = state != null;
  const isEdit = state?.type === "edit";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit transaction" : "Add transaction"}
    >
      {state ? (
        <ExpenseForm
          key={isEdit ? state.expense.id : "create"}
          mode={isEdit ? "edit" : "create"}
          initialExpense={isEdit ? state.expense : null}
          onCancel={onClose}
          onSuccess={() => {
            onFinished();
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}
