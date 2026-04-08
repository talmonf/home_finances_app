import type { UiLanguage } from "@/lib/ui-language";

/** Consultation types and expense categories: show Hebrew when UI is Hebrew and `name_he` is set. */
export function therapyLocalizedCategoryName(
  row: { name: string; name_he: string | null },
  lang: UiLanguage,
): string {
  if (lang === "he") {
    const h = row.name_he?.trim();
    if (h) return h;
  }
  return row.name;
}
