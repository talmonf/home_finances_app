import type { UiLanguage } from "@/lib/ui-language";

/** Consultation types and expense categories: show Hebrew when UI is Hebrew and `name_he` is set. */
export function therapyLocalizedCategoryName(
  row: { name: string | null | undefined; name_he: string | null },
  lang: UiLanguage,
): string {
  const canonical = (row.name ?? "").trim();
  if (lang === "he") {
    const h = row.name_he?.trim();
    if (h) return h;
  }
  if (!canonical) return "—";
  return canonical
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Treatment note field titles: English is canonical; Hebrew optional for Hebrew UI. */
export function therapyLocalizedNoteLabel(
  en: string,
  he: string | null | undefined,
  lang: UiLanguage,
): string {
  if (lang === "he") {
    const h = he?.trim();
    if (h) return h;
  }
  return en;
}
