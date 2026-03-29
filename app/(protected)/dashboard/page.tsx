import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { monthKeyFromDate, utcCalendarDateKeyFromIso } from "@/lib/format";

export default function DashboardPage() {
  const now = new Date();
  const calendarMonth = monthKeyFromDate(now);
  const todayUtc = utcCalendarDateKeyFromIso(now.toISOString()) ?? "";

  return (
    <DashboardClient calendarMonth={calendarMonth} todayUtc={todayUtc} />
  );
}
