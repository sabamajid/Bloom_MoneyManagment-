export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function monthKeyFromDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

/** Fixed English labels so SSR and browser match (avoids Node vs browser Intl differences). */
const UTC_MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const UTC_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** `YYYY-MM` → e.g. "March 2026" (UTC calendar month). */
export function formatUtcMonthKeyLong(monthKey: string): string {
  const [yy, mm] = monthKey.split("-");
  const year = Number.parseInt(yy ?? "", 10);
  const month = Number.parseInt(mm ?? "", 10);
  if (!Number.isFinite(year) || month < 1 || month > 12) return monthKey;
  return `${UTC_MONTH_LONG[month - 1]} ${year}`;
}

/** `YYYY-MM` → e.g. "Mar 2026" (UTC calendar month). */
export function formatUtcMonthKeyShort(monthKey: string): string {
  const [yy, mm] = monthKey.split("-");
  const year = Number.parseInt(yy ?? "", 10);
  const month = Number.parseInt(mm ?? "", 10);
  if (!Number.isFinite(year) || month < 1 || month > 12) return monthKey;
  return `${UTC_MONTH_SHORT[month - 1]} ${year}`;
}

/** `YYYY-MM-DD` (UTC) → e.g. "15 Mar 2026" for friendly UI labels. */
export function formatUtcDayKeyNice(dayKey: string): string {
  const [yy, mm, dd] = dayKey.split("-");
  const year = Number.parseInt(yy ?? "", 10);
  const month = Number.parseInt(mm ?? "", 10);
  const day = Number.parseInt(dd ?? "", 10);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return dayKey;
  const m = UTC_MONTH_SHORT[month - 1];
  return `${day} ${m} ${year}`;
}

/** Shift a YYYY-MM key by whole months in UTC (for calendar navigation). */
export function addMonthsUtc(monthKey: string, deltaMonths: number): string {
  const [yy, mm] = monthKey.split("-");
  const year = Number.parseInt(yy ?? "", 10);
  const month = Number.parseInt(mm ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey;
  }
  const d = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  return monthKeyFromDate(d);
}

export function previousMonthKey(monthKey: string) {
  const [yy, mm] = monthKey.split("-");
  const year = Number.parseInt(yy ?? "", 10);
  const month = Number.parseInt(mm ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey;
  }
  const d = new Date(Date.UTC(year, month - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return monthKeyFromDate(d);
}

export function monthBounds(monthKey: string) {
  const [yy, mm] = monthKey.split("-");
  const year = Number.parseInt(yy ?? "", 10);
  const month = Number.parseInt(mm ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** YYYY-MM-DD in UTC — matches how we interpret stored expense dates elsewhere. */
export function utcCalendarDateKeyFromIso(isoDate: string): string | null {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function utcCalendarDateKeyToday(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${now.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatExpenseDate(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-PK", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function parseMoneyToNumber(value: string) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}
