export type SpendSource = "budget" | "savings";

export type Expense = {
  id: string;
  user_id: string;
  /** Supabase `numeric` may arrive as a string in JSON responses. */
  amount: number | string;
  category: string;
  date: string;
  note: string | null;
  /** Which account this spend drew from (budget only; savings spends omit). */
  account_id?: string | null;
  spend_source?: SpendSource;
  /** When the row was inserted; used for the 24h edit/delete window. */
  created_at?: string;
};

export type CreateExpenseInput = {
  amount: number;
  category: string;
  date: string;
  note?: string | null;
  spendSource: SpendSource;
  /** Required when spendSource is budget. */
  accountId?: string | null;
};

export type UserCategory = {
  id: string;
  name: string;
  limitAmount: number | string | null;
};
