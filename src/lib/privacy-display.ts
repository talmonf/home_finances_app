/** Masked placeholder when the user enables demo / privacy display mode. */
export const OBFUSCATED = "••••";

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
): string {
  if (obfuscate) return OBFUSCATED;
  return `${amount} ${currency}`;
}

export function formatDecimalAmountForDisplay(
  obfuscate: boolean,
  amount: { toString(): string },
  currency: string,
): string {
  if (obfuscate) return OBFUSCATED;
  return `${amount.toString()} ${currency}`;
}
