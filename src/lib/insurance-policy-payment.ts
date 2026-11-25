export function insurancePaymentMethodValue(
  source:
    | {
        payment_method?: string | null;
        credit_card_id?: string | null;
        bank_account_id?: string | null;
      }
    | null
    | undefined,
): "" | "bank_account" | "credit_card" {
  if (!source) return "";
  if (source.payment_method === "credit_card" || source.payment_method === "bank_account") {
    return source.payment_method;
  }
  if (source.credit_card_id) return "credit_card";
  if (source.bank_account_id) return "bank_account";
  return "";
}

export function includeById<T extends { id: string }>(rows: T[], current: T | null | undefined): T[] {
  if (!current || rows.some((row) => row.id === current.id)) return rows;
  return [...rows, current];
}
