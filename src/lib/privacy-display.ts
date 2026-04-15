/** Masked placeholder when the user enables demo / privacy display mode. */
export const OBFUSCATED = "••••";
import type { UiLanguage } from "@/lib/ui-language";

export function formatClientNameForDisplay(
  obfuscate: boolean,
  firstName: string,
  lastName: string | null | undefined,
): string {
  if (obfuscate) return OBFUSCATED;
  return `${firstName} ${lastName ?? ""}`.trim();
}

export function formatMoneyLineForDisplay(
  obfuscate: boolean,
  amount: string,
  currency: string,
  uiLanguage: UiLanguage = "en",
): string {
  if (obfuscate) return OBFUSCATED;
  const normalizedCurrency = currency.trim().toUpperCase();
  const currencyLabel = uiLanguage === "he" && normalizedCurrency === "ILS" ? 'ש"ח' : currency;
  return `${amount} ${currencyLabel}`;
}

export function formatDecimalAmountForDisplay(
  obfuscate: boolean,
  amount: { toString(): string },
  currency: string,
  uiLanguage: UiLanguage = "en",
): string {
  if (obfuscate) return OBFUSCATED;
  const normalizedCurrency = currency.trim().toUpperCase();
  const currencyLabel = uiLanguage === "he" && normalizedCurrency === "ILS" ? 'ש"ח' : currency;
  return `${amount.toString()} ${currencyLabel}`;
}
