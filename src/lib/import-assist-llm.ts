/**
 * Reduces payload sent to external LLM APIs (import assist): truncation limits
 * accidental PII over-sharing and cost. Tune via env if needed.
 */
const MAX_TX_ROWS = 150;
const MAX_DESC_LEN = 240;
const MAX_CHAT_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 2000;

export type TxSummaryRow = {
  id: string;
  date: string;
  amount: number;
  direction: string;
  description: string;
};

export function sanitizeTransactionSummaryForLlm(
  rows: TxSummaryRow[] | undefined,
): TxSummaryRow[] {
  const slice = (rows ?? []).slice(0, MAX_TX_ROWS);
  return slice.map((r) => ({
    id: r.id,
    date: r.date,
    amount: r.amount,
    direction: r.direction,
    description:
      typeof r.description === "string"
        ? r.description.slice(0, MAX_DESC_LEN)
        : "",
  }));
}

export function sanitizeChatMessagesForLlm(
  messages: { role: string; text: string }[] | undefined,
): { role: "user" | "assistant" | "system"; content: string }[] {
  const list = (messages ?? []).slice(0, MAX_CHAT_MESSAGES);
  const out: { role: "user" | "assistant" | "system"; content: string }[] = [];
  for (const m of list) {
    const role = m.role as "user" | "assistant" | "system";
    if (role !== "user" && role !== "assistant" && role !== "system") continue;
    const content =
      typeof m.text === "string" ? m.text.slice(0, MAX_MESSAGE_CHARS) : "";
    out.push({ role, content });
  }
  return out;
}
