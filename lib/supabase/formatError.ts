/**
 * Supabase/PostgREST errors extend Error; Next devtools often render `console.error(err)` as `{}`
 * because serialization skips non-enumerable fields. Use this for actionable logs.
 */
export function formatSupabaseError(error: unknown): string {
  if (error == null) return "unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const e = error as Error & { code?: string; details?: string; hint?: string };
    return [e.message, e.code, e.details, e.hint].filter((x) => x != null && String(x).length > 0).join(" | ");
  }
  if (typeof error === "object") {
    const o = error as Record<string, unknown>;
    const line = [o.message, o.code, o.details, o.hint]
      .filter((x) => x != null && String(x).length > 0)
      .join(" | ");
    if (line.length > 0) return line;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
