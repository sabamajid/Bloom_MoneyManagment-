import { jsPDF } from "jspdf";

import { formatMoney, formatUtcMonthKeyLong } from "@/lib/format";
import type { Expense } from "@/types/expense";

function normalizeAmount(amount: Expense["amount"]) {
  if (typeof amount === "number") return amount;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

type ThemeMode = "blush" | "lavender" | "beige";

const PALETTES: Record<
  ThemeMode,
  {
    headerTop: [number, number, number];
    headerBottom: [number, number, number];
    ink: [number, number, number];
    accent: [number, number, number];
    muted: [number, number, number];
    rowStripe: [number, number, number];
  }
> = {
  blush: {
    headerTop: [244, 114, 182],
    headerBottom: [167, 139, 250],
    ink: [42, 26, 51],
    accent: [157, 23, 77],
    muted: [120, 90, 110],
    rowStripe: [255, 248, 252],
  },
  lavender: {
    headerTop: [139, 92, 246],
    headerBottom: [99, 102, 241],
    ink: [36, 26, 59],
    accent: [91, 33, 182],
    muted: [100, 90, 120],
    rowStripe: [248, 246, 255],
  },
  beige: {
    headerTop: [251, 146, 60],
    headerBottom: [252, 211, 77],
    ink: [54, 39, 24],
    accent: [154, 52, 18],
    muted: [110, 95, 75],
    rowStripe: [255, 251, 245],
  },
};

function resolveTheme(raw: string | null | undefined): ThemeMode {
  if (raw === "lavender" || raw === "beige") return raw;
  return "blush";
}

function categorySlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 28);
}

const M = 48;
const COL_DATE = M;
const COL_CAT = M + 78;
const COL_AMT_RIGHT = M + 298;
const COL_NOTE = M + 312;
const NOTE_W = 595 - M - COL_NOTE;

function drawTableHeader(
  doc: jsPDF,
  y: number,
  p: (typeof PALETTES)[ThemeMode],
): number {
  doc.setFillColor(p.rowStripe[0], p.rowStripe[1], p.rowStripe[2]);
  doc.rect(M, y - 12, 595 - 2 * M, 22, "F");

  doc.setDrawColor(p.accent[0], p.accent[1], p.accent[2]);
  doc.setLineWidth(0.5);
  doc.line(M, y + 10, 595 - M, y + 10);

  doc.setTextColor(p.ink[0], p.ink[1], p.ink[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Date", COL_DATE, y);
  doc.text("Category", COL_CAT, y);
  doc.text("Amount", COL_AMT_RIGHT, y, { align: "right" });
  doc.text("Note", COL_NOTE, y);
  doc.setFont("helvetica", "normal");
  return y + 22;
}

/**
 * Themed monthly expense report. Call from the client only.
 * `expenses` should already match the month (and optional category filter).
 */
export function downloadExpensesMonthPdf(options: {
  monthKey: string;
  expenses: Expense[];
  monthlyLimit: number | null;
  themeAttr?: string | null;
  /** When set, report is scoped to this category label. */
  categoryFilterLabel?: string | null;
}) {
  const theme = resolveTheme(options.themeAttr ?? document.documentElement.getAttribute("data-theme"));
  const p = PALETTES[theme];

  const expenses = [...options.expenses]
    .filter((e) => (e.spend_source ?? "budget") === "budget")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const total = expenses.reduce((sum, e) => sum + normalizeAmount(e.amount), 0);
  const limit = options.monthlyLimit;
  const monthLong = formatUtcMonthKeyLong(options.monthKey);
  const scopeLine =
    options.categoryFilterLabel && options.categoryFilterLabel.length
      ? `Category: ${options.categoryFilterLabel}`
      : "Category scope: All categories";

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header gradient band (Bloom-style rose → violet)
  const steps = 32;
  const bandH = 96;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(p.headerTop[0] + (p.headerBottom[0] - p.headerTop[0]) * t);
    const g = Math.round(p.headerTop[1] + (p.headerBottom[1] - p.headerTop[1]) * t);
    const b = Math.round(p.headerTop[2] + (p.headerBottom[2] - p.headerTop[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(0, (bandH / steps) * i, pageW, bandH / steps + 0.5, "F");
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Bloom", M, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Money Management", M, 72);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Monthly report · ${monthLong} (${options.monthKey})`, M, 90);

  let y = 124;

  doc.setTextColor(p.ink[0], p.ink[1], p.ink[2]);
  doc.setDrawColor(p.accent[0], p.accent[1], p.accent[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, pageW - 2 * M, 78, 10, 10, "S");

  doc.setFillColor(p.rowStripe[0], p.rowStripe[1], p.rowStripe[2]);
  doc.roundedRect(M + 1, y + 1, pageW - 2 * M - 2, 76, 9, 9, "F");

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(p.accent[0], p.accent[1], p.accent[2]);
  doc.text("Summary", M + 16, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(p.ink[0], p.ink[1], p.ink[2]);
  y += 18;
  doc.text(`Total spending: ${formatMoney(total)}`, M + 16, y);
  y += 16;
  doc.text(`Monthly limit: ${limit == null ? "Not set" : formatMoney(limit)}`, M + 16, y);
  y += 16;
  doc.setTextColor(p.muted[0], p.muted[1], p.muted[2]);
  doc.setFontSize(9);
  doc.text(`${scopeLine} · ${expenses.length} line item${expenses.length === 1 ? "" : "s"}`, M + 16, y);

  y = 124 + 78 + 20;

  y = drawTableHeader(doc, y, p);

  doc.setFontSize(9);
  let row = 0;
  for (const item of expenses) {
    if (y > pageH - M - 28) {
      doc.setFontSize(8);
      doc.setTextColor(p.muted[0], p.muted[1], p.muted[2]);
      doc.text("Bloom · PKR", pageW / 2, pageH - 28, { align: "center" });
      doc.addPage();
      y = M + 8;
      y = drawTableHeader(doc, y, p);
      doc.setFontSize(9);
      row = 0;
    }

    if (row % 2 === 0) {
      doc.setFillColor(p.rowStripe[0], p.rowStripe[1], p.rowStripe[2]);
      doc.rect(M, y - 10, pageW - 2 * M, 18, "F");
    }

    const date = item.date.slice(0, 10);
    const amount = formatMoney(normalizeAmount(item.amount));
    const noteRaw = (item.note ?? "—").trim() || "—";
    const cat = item.category.length > 22 ? `${item.category.slice(0, 20)}…` : item.category;
    const noteLines = doc.splitTextToSize(noteRaw, NOTE_W);
    const note = (noteLines[0] ?? "—").length > 52 ? `${(noteLines[0] ?? "").slice(0, 50)}…` : (noteLines[0] ?? "—");

    doc.setTextColor(p.ink[0], p.ink[1], p.ink[2]);
    doc.text(date, COL_DATE, y);
    doc.text(cat, COL_CAT, y);
    doc.setFont("helvetica", "bold");
    doc.text(amount, COL_AMT_RIGHT, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(note, COL_NOTE, y);

    y += 18;
    row += 1;
  }

  doc.setFontSize(8);
  doc.setTextColor(p.muted[0], p.muted[1], p.muted[2]);
  doc.text("Bloom · PKR · UTC dates", pageW / 2, pageH - 28, { align: "center" });

  const slug =
    options.categoryFilterLabel && options.categoryFilterLabel.length
      ? `-${categorySlug(options.categoryFilterLabel)}`
      : "";
  doc.save(`bloom-expenses-${options.monthKey}${slug}.pdf`);
}
