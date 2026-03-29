export type SavingsLedgerEntryType = "monthly_rollover" | "spend_from_savings";

export type SavingsLedgerEntry = {
  id: string;
  user_id: string;
  entry_type: SavingsLedgerEntryType;
  amount: number;
  source_month: string | null;
  period_month: string;
  expense_id: string | null;
  note: string | null;
  created_at: string;
};

export type SavingsMonthlyBreakdown = {
  monthKey: string;
  rolloverIn: number;
  spentFromSavings: number;
  net: number;
};
