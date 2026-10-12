/** Short label for credit-card dropdowns and payment cells: `Card name · ****1234`. */
export function formatCreditCardOptionLabel(card: {
  card_name: string;
  card_last_four: string;
}): string {
  const name = card.card_name.trim();
  const last4 = card.card_last_four.trim();
  if (name && last4) return `${name} · ****${last4}`;
  if (name) return name;
  if (last4) return `****${last4}`;
  return "";
}
