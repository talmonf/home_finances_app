/**
 * Parse bank statement files (Excel, PDF) into normalized transaction rows.
 * Output: { date: string (YYYY-MM-DD), amount: number, direction: 'debit'|'credit', description: string }[]
 */

export type ParsedTransactionRow = {
  date: string;
  amount: number;
  direction: "debit" | "credit";
  description: string;
  rawBalance?: string;
};

export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedTransactionRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
  if (rows.length < 2) return [];

  // Detect header row (look for date-like, amount-like, description-like columns)
  const headerRow = rows[0] as string[];
  const colIndex = findColumnIndices(headerRow);
  const out: ParsedTransactionRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as string[];
    const dateStr = colIndex.date >= 0 ? String(row[colIndex.date] ?? "").trim() : "";
    const amountStr = colIndex.amount >= 0 ? String(row[colIndex.amount] ?? "").trim() : "";
    const creditStr = colIndex.credit >= 0 ? String(row[colIndex.credit] ?? "").trim() : "";
    const debitStr = colIndex.debit >= 0 ? String(row[colIndex.debit] ?? "").trim() : "";
    const descStr = colIndex.description >= 0 ? String(row[colIndex.description] ?? "").trim() : "";
    const balanceStr = colIndex.balance >= 0 ? String(row[colIndex.balance] ?? "").trim() : "";

    const { date, amount, direction } = normalizeAmountAndDate(dateStr, amountStr, creditStr, debitStr);
    if (!date || amount === 0) continue;

    const key = `${date}|${amount}|${direction}|${descStr}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      date,
      amount: Math.abs(amount),
      direction,
      description: descStr || "—",
      rawBalance: balanceStr || undefined,
    });
  }

  return out;
}

function findColumnIndices(header: string[]): {
  date: number;
  amount: number;
  credit: number;
  debit: number;
  description: number;
  balance: number;
} {
  const lower = header.map((h) => String(h).toLowerCase());
  const date = lower.findIndex((h) => /date|תאריך/.test(h));
  const amount = lower.findIndex((h) => /amount|סכום|sum/.test(h) && !/credit|debit/.test(h));
  const credit = lower.findIndex((h) => /credit|הכנסה|זכות/.test(h));
  const debit = lower.findIndex((h) => /debit|חובה|הוצאה|withdrawal/.test(h));
  const description = lower.findIndex((h) => /description|details|תיאור|פרטים/.test(h));
  const balance = lower.findIndex((h) => /balance|יתרה/.test(h));

  return {
    date: date >= 0 ? date : 0,
    amount: amount >= 0 ? amount : 1,
    credit: credit >= 0 ? credit : -1,
    debit: debit >= 0 ? debit : -1,
    description: description >= 0 ? description : Math.max(2, lower.length - 1),
    balance: balance >= 0 ? balance : -1,
  };
}

function normalizeAmountAndDate(
  dateStr: string,
  amountStr: string,
  creditStr: string,
  debitStr: string
): { date: string; amount: number; direction: "debit" | "credit" } {
  let amount = 0;
  let direction: "debit" | "credit" = "debit";

  const num = (s: string) => {
    const n = parseFloat(String(s).replace(/[^\d.-]/g, "").replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  };

  if (creditStr && num(creditStr) > 0) {
    amount = num(creditStr);
    direction = "credit";
  } else if (debitStr && num(debitStr) > 0) {
    amount = num(debitStr);
    direction = "debit";
  } else if (amountStr) {
    amount = num(amountStr);
    direction = amount >= 0 ? "credit" : "debit";
    amount = Math.abs(amount);
  }

  const date = parseDateString(dateStr);
  return { date, amount, direction };
}

function parseDateString(s: string): string {
  if (!s || !String(s).trim()) return "";
  const str = String(s).trim();
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedTransactionRow[]> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  const text = data.text || "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const out: ParsedTransactionRow[] = [];
  const dateRe = /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})/;
  const numRe = /[\d,]+\.?\d*/g;

  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    const dateStr = dateMatch ? dateMatch[1] : "";
    const date = parseDateString(dateStr);
    if (!date) continue;

    const numbers = line.match(numRe);
    if (!numbers || numbers.length < 1) continue;

    const amounts = numbers.map((n) => parseFloat(n.replace(",", "")));
    const lastNum = amounts[amounts.length - 1];
    if (lastNum === 0) continue;

    const direction: "debit" | "credit" = lastNum > 0 ? "credit" : "debit";
    const desc = line.replace(dateRe, "").replace(numRe, "").replace(/\s+/g, " ").trim() || "—";

    out.push({
      date,
      amount: Math.abs(lastNum),
      direction,
      description: desc.slice(0, 500),
    });
  }

  return out;
}
