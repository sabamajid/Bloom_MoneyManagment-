export type UserAccount = {
  id: string;
  user_id: string;
  name: string;
  /** Supabase `numeric` may arrive as a string in JSON. */
  opening_balance: number | string;
  created_at: string;
};

export type AccountWithBalance = {
  id: string;
  name: string;
  opening_balance: number;
  spent: number;
  balance: number;
};
