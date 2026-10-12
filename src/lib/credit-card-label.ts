/** First whitespace-separated token of a family member's full name. */
function cardHolderFirstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

/**
 * Label for credit-card dropdowns and payment cells: `Card name First 1234`.
 * The holder's first name sits immediately before the last four digits.
 * Pass `family_member` from the credit card relation.
 */
export function formatCreditCardOptionLabel(card: {
  card_name: string;
  card_last_four: string;
  family_member?: { full_name: string | null } | null;
}): string {
  const name = card.card_name.trim();
  const holder = cardHolderFirstName(card.family_member?.full_name);
  const last4 = card.card_last_four.trim();
  return [name, holder, last4].filter((part) => part.length > 0).join(" ");
}
