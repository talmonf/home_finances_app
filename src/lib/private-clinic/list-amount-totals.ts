import { formatMoneyLineForDisplay, OBFUSCATED } from "@/lib/privacy-display";
import type { UiLanguage } from "@/lib/ui-language";

export type AmountTotalsByCurrency = Array<{ currency: string; total: number }>;

export function normalizeListAmountCurrency(currency: string | null | undefined): string {
  return (currency ?? "").trim() || "ILS";
}

export function addAmountToTotalsByCurrency(
  totals: Map<string, number>,
  amount: number,
  currency: string | null | undefined,
): void {
  if (!Number.isFinite(amount)) return;
  const key = normalizeListAmountCurrency(currency);
  totals.set(key, (totals.get(key) ?? 0) + amount);
}

export function sortAmountTotalsByCurrency(totals: Map<string, number>): AmountTotalsByCurrency {
  return [...totals.entries()]
    .sort(([a], [b]) => {
      if (a === "ILS") return -1;
      if (b === "ILS") return 1;
      return a.localeCompare(b);
    })
    .map(([currency, total]) => ({ currency, total }));
}

export function formatAmountTotalsByCurrencyForDisplay(
  obfuscate: boolean,
  totals: AmountTotalsByCurrency,
  uiLanguage: UiLanguage,
): string {
  if (obfuscate) return OBFUSCATED;
  if (totals.length === 0) return "—";
  return totals
    .map(({ currency, total }) => formatMoneyLineForDisplay(false, total.toFixed(2), currency, uiLanguage))
    .join(", ");
}

export function formatListAmountTotalLine(
  obfuscate: boolean,
  totalLabel: string,
  recordCount: number,
  recordsLabel: string,
  totals: AmountTotalsByCurrency,
  uiLanguage: UiLanguage,
): string {
  if (obfuscate) return OBFUSCATED;
  const amounts = formatAmountTotalsByCurrencyForDisplay(false, totals, uiLanguage);
  return `${totalLabel} (${recordCount} ${recordsLabel}): ${amounts}`;
}
