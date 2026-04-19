/**
 * RiseUp (input.riseup.co.il) CSV export: detection, normalization, row extraction.
 */

/** Values observed in RiseUp "סוג מקור" */
export type RiseUpSourceKind = "checkingAccount" | "creditCard" | string;

export type RiseUpParsedRow = {
  rowIndex: number;
  /** Normalized merchant / counterparty */
  businessName: string;
  paymentMethodRaw: string;
  paymentIdentifierRaw: string;
  sourceKind: RiseUpSourceKind;
  paymentDate: string;
  chargeDate: string | null;
  /** Signed: negative = outflow, positive = inflow (RiseUp cashflow sign). */
  amount: number;
  originalAmount: number | null;
  cashflowCategory: string;
  /** When true, row is kept but not "final" until user resolves zero-amount placeholder. */
  isZeroAmountPending: boolean;
  /** Full raw row for persistence / audit */
  raw: Record<string, string>;
};

const REQUIRED_HEADERS = [
  "שם העסק",
  "אמצעי התשלום",
  "תאריך התשלום",
  "סכום",
  "סוג מקור",
] as const;

function stripBom(s: string): string {
  return s.replace(/^\ufeff/, "").trim();
}

function normalizeHeaderCell(h: unknown): string {
  return stripBom(String(h ?? ""));
}

/** Map normalized header -> index */
export function riseUpHeaderIndexMap(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, i) => {
    const k = normalizeHeaderCell(cell);
    if (k && !map.has(k)) map.set(k, i);
  });
  return map;
}

export function isRiseUpHeaderRow(headerRow: unknown[]): boolean {
  const map = riseUpHeaderIndexMap(headerRow);
  return REQUIRED_HEADERS.every((h) => map.has(h));
}

function col(
  map: Map<string, number>,
  row: unknown[],
  key: string,
  altKeys?: string[],
): string {
  let idx = map.get(key);
  if (idx === undefined && altKeys) {
    for (const a of altKeys) {
      idx = map.get(a);
      if (idx !== undefined) break;
    }
  }
  if (idx === undefined || idx < 0) return "";
  return String(row[idx] ?? "").trim();
}

/** Parse DD/MM/YYYY or Excel serial (fallback). */
export function parseRiseUpDate(raw: string): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
      return null;
    }
    return dt.toISOString().slice(0, 10);
  }
  const n = Number(s);
  if (!Number.isNaN(n) && n > 20000) {
    // Excel serial date — SheetJS sometimes gives number; we mostly get strings from CSV
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + n * 86400000;
    const dt = new Date(ms);
    return dt.toISOString().slice(0, 10);
  }
  const tryD = new Date(s);
  if (!Number.isNaN(tryD.getTime())) return tryD.toISOString().slice(0, 10);
  return null;
}

/**
 * Parse amount with Israeli-style separators; preserves sign.
 */
export function parseRiseUpAmount(raw: string): number {
  let s = String(raw).trim();
  if (!s) return NaN;
  s = s.replace(/\s/g, "");
  const neg = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");
  if (neg && !s.startsWith("-")) s = `-${s}`;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // e.g. 1,234.56 → US; 1.234,56 → EU
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = parts[0].replace(/\./g, "") + "." + parts[1];
    } else {
      s = s.replace(/,/g, "");
    }
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? NaN : n;
}

function parseOriginalAmount(raw: string): number | null {
  const n = parseRiseUpAmount(raw);
  if (Number.isNaN(n) || n === 0) return null;
  return n;
}

export function parseRiseUpRowsFromMatrix(rows: unknown[][]): RiseUpParsedRow[] {
  if (rows.length < 2) return [];
  const headerRow = rows[0] ?? [];
  if (!isRiseUpHeaderRow(headerRow)) {
    throw new Error("Not a RiseUp export: missing required Hebrew column headers.");
  }
  const map = riseUpHeaderIndexMap(headerRow);
  const out: RiseUpParsedRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;

    const raw: Record<string, string> = {};
    for (const [name, idx] of map.entries()) {
      raw[name] = String(row[idx] ?? "").trim();
    }

    const businessName = col(map, row, "שם העסק");
    const paymentMethodRaw = col(map, row, "אמצעי התשלום");
    const paymentIdentifierRaw = col(map, row, "אמצעי זיהוי התשלום");
    const paymentDateRaw = col(map, row, "תאריך התשלום");
    const chargeDateRaw = col(map, row, "תאריך החיוב בחשבון");
    const amountRaw = col(map, row, "סכום");
    const sourceKind = col(map, row, "סוג מקור") as RiseUpSourceKind;
    const cashflowCategory = col(map, row, "קטגוריה בתזרים", ["קטגוריה"]);
    const originalRaw = col(map, row, "סכום מקורי");

    const paymentDate = parseRiseUpDate(paymentDateRaw);
    const chargeDate = chargeDateRaw ? parseRiseUpDate(chargeDateRaw) : null;
    const amount = parseRiseUpAmount(amountRaw);
    const originalAmount = parseOriginalAmount(originalRaw);

    const isZeroAmountPending = amount === 0 || Number.isNaN(amount);

    out.push({
      rowIndex: i - 1,
      businessName: businessName || "—",
      paymentMethodRaw,
      paymentIdentifierRaw,
      sourceKind: sourceKind || "unknown",
      paymentDate: paymentDate ?? "",
      chargeDate,
      amount: Number.isNaN(amount) ? 0 : amount,
      originalAmount,
      cashflowCategory: cashflowCategory || "",
      isZeroAmountPending,
      raw,
    });
  }

  return out;
}

export async function parseRiseUpCsvBuffer(buffer: Buffer): Promise<RiseUpParsedRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return parseRiseUpRowsFromMatrix(rows);
}

/** Safe JSON-serializable snapshot for `source_records.riseup_row`. */
export function riseUpRowToJson(raw: Record<string, string>): object {
  return { ...raw };
}
