import { ExpensesClient } from "@/components/expenses/ExpensesClient";
import { monthKeyFromDate, utcCalendarDateKeyFromIso } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  const now = new Date();
  const initialMonth = monthKeyFromDate(now);
  const todayUtc = utcCalendarDateKeyFromIso(now.toISOString()) ?? "";

  return <ExpensesClient initialMonth={initialMonth} todayUtc={todayUtc} />;
}
