export type Expense = {
  id: string;
  user_id: string;
  /** Supabase `numeric` may arrive as a string in JSON responses. */
  amount: number | string;
  category: string;
  date: string;
  note: string | null;
  /** Which account this spend drew from (required for new rows; legacy rows may be null or omitted). */
  account_id?: string | null;
};

export type CreateExpenseInput = {
  amount: number;
  category: string;
  date: string;
  note?: string | null;
  accountId: string;
};

export type UserCategory = {
  id: string;
  name: string;
  limitAmount: number | string | null;
};
