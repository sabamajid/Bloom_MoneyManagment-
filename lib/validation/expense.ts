import type { CreateExpenseInput, SpendSource } from "@/types/expense";

export function normalizeNote(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCreateExpenseInput(body: unknown):
  | { ok: true; value: CreateExpenseInput }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid JSON body." };
  }

  const record = body as Record<string, unknown>;

  const amountRaw = record.amount;
  const categoryRaw = record.category;
  const dateRaw = record.date;
  const noteRaw = record.note;
  const accountIdRaw = record.accountId;
  const spendSourceRaw = record.spendSource;

  if (typeof amountRaw !== "number" || !Number.isFinite(amountRaw)) {
    return { ok: false, message: "Amount must be a number." };
  }
  if (amountRaw <= 0) {
    return { ok: false, message: "Amount must be greater than 0." };
  }

  if (typeof categoryRaw !== "string") {
    return { ok: false, message: "Category is required." };
  }
  const normalizedCategory = categoryRaw.trim();
  if (normalizedCategory.length < 2 || normalizedCategory.length > 40) {
    return { ok: false, message: "Please choose a valid category." };
  }

  if (typeof dateRaw !== "string") {
    return { ok: false, message: "Date is required." };
  }
  const parsedDate = new Date(dateRaw);
  if (Number.isNaN(parsedDate.getTime())) {
    return { ok: false, message: "Date must be a valid date." };
  }

  const note = normalizeNote(noteRaw);

  let spendSource: SpendSource = "budget";
  if (spendSourceRaw !== undefined && spendSourceRaw !== null) {
    if (spendSourceRaw !== "budget" && spendSourceRaw !== "savings") {
      return { ok: false, message: "Spend source must be budget or savings." };
    }
    spendSource = spendSourceRaw;
  }

  let accountId: string | null = null;
  if (spendSource === "budget") {
    if (typeof accountIdRaw !== "string") {
      return { ok: false, message: "Account is required for budget spending." };
    }
    const id = accountIdRaw.trim();
    if (!UUID_RE.test(id)) {
      return { ok: false, message: "Invalid account." };
    }
    accountId = id;
  } else {
    if (accountIdRaw !== undefined && accountIdRaw !== null && String(accountIdRaw).trim() !== "") {
      return { ok: false, message: "Savings spending does not use an account." };
    }
  }

  return {
    ok: true,
    value: {
      amount: Math.round(amountRaw * 100) / 100,
      category: normalizedCategory,
      date: parsedDate.toISOString(),
      note,
      spendSource,
      accountId,
    },
  };
}
