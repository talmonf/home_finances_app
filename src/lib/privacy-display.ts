import type { UiLanguage } from "@/lib/ui-language";

/** Masked placeholder when the user enables demo / privacy display mode. */
export const OBFUSCATED = "••••";

/** Mask a personal or free-text value. Empty values stay empty. */
export function maskSensitiveText(
  obfuscate: boolean,
  value: string | null | undefined,
): string {
  if (value == null) return "";
  if (!obfuscate) return value;
  if (value.trim() === "") return value;
  return OBFUSCATED;
}

/** Mask a formatted money amount. Callers pass the already-formatted string. */
export function maskSensitiveAmount(obfuscate: boolean, formatted: string): string {
  if (!obfuscate) return formatted;
  if (formatted.trim() === "" || formatted.trim() === "—") return formatted;
  return OBFUSCATED;
}

export function formatClientNameForDisplay(
  obfuscate: boolean,
  firstName: string,
  lastName: string | null | undefined,
): string {
  if (obfuscate) return OBFUSCATED;
  return `${firstName} ${lastName ?? ""}`.trim();
}

function decimalStringWithGrouping(amountStr: string, uiLanguage: UiLanguage): string {
  const trimmed = amountStr.trim();
  const sign = trimmed.startsWith("-") ? "-" : "";
  const body = sign ? trimmed.slice(1).trimStart() : trimmed;
  const locale = uiLanguage === "he" ? "he-IL" : "en-US";

  const dot = body.indexOf(".");
  const intRaw = (dot >= 0 ? body.slice(0, dot) : body) || "0";
  const fracRaw = dot >= 0 ? body.slice(dot + 1) : undefined;

  const intNum = Number(intRaw);
  if (!Number.isFinite(intNum)) return trimmed;

  const intGrouped = intNum.toLocaleString(locale, { useGrouping: true, maximumFractionDigits: 0 });
  const withFrac = fracRaw !== undefined ? `${intGrouped}.${fracRaw}` : intGrouped;

  return `${sign}${withFrac}`;
}

export function formatMoneyLineForDisplay(
  obfuscate: boolean,
  amount: string,
  currency: string | null | undefined,
  uiLanguage: UiLanguage = "en",
): string {
  if (obfuscate) return OBFUSCATED;
  const currencySafe = (currency ?? "").trim() || "ILS";
  const normalizedCurrency = currencySafe.toUpperCase();
  const currencyLabel = uiLanguage === "he" && normalizedCurrency === "ILS" ? 'ש"ח' : currencySafe;
  const grouped = decimalStringWithGrouping(amount, uiLanguage);
  return uiLanguage === "he" ? `${currencyLabel} ${grouped}` : `${grouped} ${currencyLabel}`;
}

export function formatDecimalAmountForDisplay(
  obfuscate: boolean,
  amount: { toString(): string },
  currency: string | null | undefined,
  uiLanguage: UiLanguage = "en",
): string {
  if (obfuscate) return OBFUSCATED;
  const currencySafe = (currency ?? "").trim() || "ILS";
  const normalizedCurrency = currencySafe.toUpperCase();
  const currencyLabel = uiLanguage === "he" && normalizedCurrency === "ILS" ? 'ש"ח' : currencySafe;
  const grouped = decimalStringWithGrouping(amount.toString(), uiLanguage);
  return uiLanguage === "he" ? `${currencyLabel} ${grouped}` : `${grouped} ${currencyLabel}`;
}
