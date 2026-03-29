const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuid(value: unknown, label: string): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== "string" || !UUID_RE.test(value.trim())) {
    return { ok: false, message: `${label} must be a valid id.` };
  }
  return { ok: true, value: value.trim() };
}

export type CreateAccountInput = {
  name: string;
  opening_balance: number;
};

export function parseCreateAccountInput(body: unknown):
  | { ok: true; value: CreateAccountInput }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid JSON body." };
  }
  const record = body as Record<string, unknown>;

  const nameRaw = record.name;
  if (typeof nameRaw !== "string") {
    return { ok: false, message: "Name is required." };
  }
  const name = nameRaw.trim();
  if (name.length < 1 || name.length > 64) {
    return { ok: false, message: "Name must be 1–64 characters." };
  }

  let opening_balance = 0;
  const obRaw = record.opening_balance;
  if (obRaw !== undefined && obRaw !== null) {
    if (typeof obRaw !== "number" || !Number.isFinite(obRaw)) {
      return { ok: false, message: "Balance must be a number." };
    }
    opening_balance = Math.round(obRaw * 100) / 100;
  }

  return { ok: true, value: { name, opening_balance } };
}

export type UpdateAccountInput = {
  name?: string;
  opening_balance?: number;
};

export function parseUpdateAccountInput(body: unknown):
  | { ok: true; value: UpdateAccountInput }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid JSON body." };
  }
  const record = body as Record<string, unknown>;
  const out: UpdateAccountInput = {};

  if (record.name !== undefined) {
    if (typeof record.name !== "string") {
      return { ok: false, message: "Name must be a string." };
    }
    const name = record.name.trim();
    if (name.length < 1 || name.length > 64) {
      return { ok: false, message: "Name must be 1–64 characters." };
    }
    out.name = name;
  }

  if (record.opening_balance !== undefined) {
    if (typeof record.opening_balance !== "number" || !Number.isFinite(record.opening_balance)) {
      return { ok: false, message: "Balance must be a finite number." };
    }
    out.opening_balance = Math.round(record.opening_balance * 100) / 100;
  }

  if (out.name === undefined && out.opening_balance === undefined) {
    return { ok: false, message: "Nothing to update." };
  }

  return { ok: true, value: out };
}
