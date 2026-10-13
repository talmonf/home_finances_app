export const KUPAT_HOLIM_VALUES = ["clalit", "maccabi", "meuhedet", "leumit"] as const;

export type KupatHolimValue = (typeof KUPAT_HOLIM_VALUES)[number];

/** Empty means no filter. `none` matches clients with no Kupat Holim set. */
export type KupatHolimFilter = "" | KupatHolimValue | "none";

export function parseKupatHolimFilter(raw: string | undefined | null): KupatHolimFilter {
  const value = raw?.trim() ?? "";
  if (value === "none" || value === "clalit" || value === "maccabi" || value === "meuhedet" || value === "leumit") {
    return value;
  }
  return "";
}

export function kupatHolimClientMatch(
  filter: Exclude<KupatHolimFilter, "">,
): { kupat_holim: KupatHolimValue | null } {
  return { kupat_holim: filter === "none" ? null : filter };
}

export function kupatHolimFilterSelectOptions(
  labels: {
    clalit: string;
    maccabi: string;
    meuhedet: string;
    leumit: string;
    none: string;
  },
  locale: "he" | "en",
): Array<{ id: Exclude<KupatHolimFilter, "">; label: string }> {
  const funds = [
    { id: "clalit" as const, label: labels.clalit },
    { id: "maccabi" as const, label: labels.maccabi },
    { id: "meuhedet" as const, label: labels.meuhedet },
    { id: "leumit" as const, label: labels.leumit },
  ].sort((a, b) => a.label.localeCompare(b.label, locale));
  return [...funds, { id: "none", label: labels.none }];
}
