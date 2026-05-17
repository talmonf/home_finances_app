export function preferHebrewFromAcceptLanguage(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  const parts = acceptLanguage.split(",").map((p) => p.trim().split(";")[0]?.toLowerCase() ?? "");
  return parts.some((tag) => tag === "he" || tag.startsWith("he-"));
}
