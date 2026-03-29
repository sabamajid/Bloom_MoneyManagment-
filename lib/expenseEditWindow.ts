/** Expenses may be edited or deleted only within this window after `created_at`. */
export const EXPENSE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isExpenseEditable(createdAt: string | null | undefined): boolean {
  if (createdAt == null || createdAt === "") return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= EXPENSE_EDIT_WINDOW_MS;
}
