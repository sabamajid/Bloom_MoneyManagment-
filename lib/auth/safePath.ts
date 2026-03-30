/** Internal redirect targets only — blocks protocol-relative and external URLs. */
export function safeAppPath(next: string | undefined): string {
  if (!next || typeof next !== "string") return "/dashboard";
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard";
  return t;
}
