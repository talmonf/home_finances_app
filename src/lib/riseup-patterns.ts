import type { RiseUpAnalyzedRow } from "@/lib/riseup-matching";
import type {
  RiseUpDetectedPattern,
  RiseUpPatternKind,
  RiseUpPatternSummary,
  RiseUpProposalConfidence,
  RiseUpProposalSupportRow,
} from "@/lib/riseup-commit-types";

export type RiseUpPatternRow = RiseUpAnalyzedRow & {
  riseup_import_key: string;
  importStatus?: string;
};

function normalizePatternText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/['"`׳״]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function monthOf(row: RiseUpPatternRow): string {
  return row.paymentDate.slice(0, 7);
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function rowText(row: RiseUpPatternRow): string {
  return normalizePatternText(
    `${row.businessName} ${row.cashflowCategory} ${row.paymentMethodRaw} ${row.raw["הערות"] ?? ""}`,
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function support(row: RiseUpPatternRow, confidence: RiseUpProposalConfidence): RiseUpProposalSupportRow {
  return {
    rowIndex: row.rowIndex,
    riseup_import_key: row.riseup_import_key,
    support_role: "recurring_instance",
    confidence,
  };
}

function paymentNumber(row: RiseUpPatternRow): number | null {
  const n = Number(String(row.raw["מספר התשלום"] ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function totalPayments(row: RiseUpPatternRow): number | null {
  const n = Number(String(row.raw["מספר תשלומים כולל"] ?? "").trim());
  return Number.isFinite(n) && n > 1 ? n : null;
}

function classifyIncome(row: RiseUpPatternRow): RiseUpPatternKind {
  const text = rowText(row);
  if (includesAny(text, ["ביטוח לאומי", "בטוח לאומי", "קיצבת", "קצבת ילדים"])) {
    return "benefit_income";
  }
  if (includesAny(text, ["זיכוי", "החזר", "ריבית", "ביט", "פייבוקס", "paybox", "refund"])) {
    return "transfer_or_refund_income";
  }
  if (
    includesAny(text, ["משכורת", "שכר", "salary", "payroll"]) ||
    (row.cashflowCategory.includes("הכנסות קבועות") &&
      !includesAny(text, ["ביט", "פייבוקס", "זיכוי", "החזר"]))
  ) {
    return "work_income";
  }
  return "transfer_or_refund_income";
}

function expenseKind(row: RiseUpPatternRow): RiseUpPatternKind | null {
  const text = rowText(row);
  if (totalPayments(row)) return "installment_or_annual";
  if (includesAny(text, ["הלווא", "משכנת", "החזר הלווא", "מימון"])) return "loan_return";
  if (
    includesAny(text, [
      "ביטוח",
      "הראל",
      "מגדל",
      "כלל",
      "מנורה",
      "הפניקס",
      "פניקס",
      "איילון",
      "ליברה",
    ])
  ) {
    return "insurance";
  }
  if (includesAny(text, ["דלק", "תדלוק"]) || (row.cashflowCategory.includes("רכב") && includesAny(text, ["פז", "yellow", "סונול", "דור אלון", "טן"]))) {
    return "petrol";
  }
  if (includesAny(text, ["פז", "yellow", "סונול", "דור אלון", "טן"])) return "petrol_review";
  if (
    includesAny(text, ["google", "youtube", "claude", "מנוי", "subscription", "דמי חבר"]) ||
    row.cashflowCategory.includes("מנויים") ||
    row.cashflowCategory.includes("דיגיטל")
  ) {
    return "subscription";
  }
  if (
    includesAny(text, ["ארנונה", "עירית", "עיריית", "בזק", "פרטנר", "הוראת קבע", "קופח", "חשמל", "מים", "גז"]) ||
    row.utilityCategoryHint
  ) {
    return "recurring_obligation";
  }
  return null;
}

function confidenceFor(kind: RiseUpPatternKind, activeMonths: number, rowCount: number): RiseUpProposalConfidence {
  if (kind === "transfer_or_refund_income" || kind === "petrol_review") return "low";
  if (activeMonths >= 4 || rowCount >= 4) return "high";
  if (activeMonths >= 2 || rowCount >= 2) return "medium";
  return "low";
}

function amountKey(row: RiseUpPatternRow): string {
  return Math.abs(row.originalAmount ?? row.amount).toFixed(0);
}

function patternKey(row: RiseUpPatternRow, kind: RiseUpPatternKind): string {
  if (kind === "payment_instrument") {
    return `${row.sourceKind}:${normalizePatternText(row.paymentMethodRaw)}:${row.paymentIdentifierRaw.trim()}`;
  }
  if (kind === "installment_or_annual") {
    return `${kind}:${normalizePatternText(row.businessName)}:${amountKey(row)}:${totalPayments(row) ?? ""}:${row.paymentIdentifierRaw}`;
  }
  return `${kind}:${normalizePatternText(row.businessName)}`;
}

function buildPattern(
  kind: RiseUpPatternKind,
  group: RiseUpPatternRow[],
  globalFirstMonth: string,
  globalLastMonth: string,
): RiseUpDetectedPattern | null {
  const first = group[0];
  if (!first) return null;
  const monthSet = new Set(group.map(monthOf).filter(Boolean));
  const sortedMonths = [...monthSet].sort();
  const amounts = group.map((row) => Math.abs(row.amount));
  const confidence = confidenceFor(kind, monthSet.size, group.length);
  const title =
    kind === "payment_instrument"
      ? `${first.sourceKind === "creditCard" ? "Credit card" : "Bank account"}: ${first.paymentMethodRaw} ${first.paymentIdentifierRaw}`
      : first.businessName;

  return {
    key: patternKey(first, kind),
    kind,
    title,
    confidence,
    firstMonth: sortedMonths[0] ?? "",
    lastMonth: sortedMonths[sortedMonths.length - 1] ?? "",
    activeMonths: monthSet.size,
    rowCount: group.length,
    averageAmount: Math.round(average(amounts)),
    medianAmount: Math.round(median(amounts)),
    totalAmount: Math.round(amounts.reduce((sum, amount) => sum + amount, 0)),
    startedDuringPeriod: (sortedMonths[0] ?? "") > globalFirstMonth,
    endedDuringPeriod: (sortedMonths[sortedMonths.length - 1] ?? "") < globalLastMonth,
    reviewReason:
      kind === "transfer_or_refund_income"
        ? "Transfer/refund-like income needs user confirmation before creating a durable income source."
        : kind === "petrol_review"
          ? "Merchant name looks fuel-adjacent, but the category may be food, gas utility, or another non-petrol expense."
          : undefined,
    metadata: {
      cashflowCategory: first.cashflowCategory,
      sourceKind: first.sourceKind,
      paymentMethodRaw: first.paymentMethodRaw,
      paymentIdentifierRaw: first.paymentIdentifierRaw,
      totalPayments: totalPayments(first),
      observedPaymentNumbers: group.map(paymentNumber).filter((n): n is number => n !== null).sort((a, b) => a - b),
      originalAmount: Math.round(Math.abs(first.originalAmount ?? first.amount)),
    },
    supportRows: group.slice(0, 25).map((row) => support(row, confidence)),
  };
}

export function analyzeRiseUpPatterns(rows: RiseUpPatternRow[]): RiseUpDetectedPattern[] {
  const datedRows = rows.filter((row) => row.paymentDate);
  const allMonths = [...new Set(datedRows.map(monthOf))].sort();
  const globalFirstMonth = allMonths[0] ?? "";
  const globalLastMonth = allMonths[allMonths.length - 1] ?? "";
  const patterns: RiseUpDetectedPattern[] = [];

  for (const group of groupBy(datedRows, (row) => patternKey(row, "payment_instrument")).values()) {
    const pattern = buildPattern("payment_instrument", group, globalFirstMonth, globalLastMonth);
    if (pattern && group.length >= 2) patterns.push(pattern);
  }

  const incomeRows = datedRows.filter((row) => row.amount > 0);
  for (const row of incomeRows) {
    const kind = classifyIncome(row);
    (row as RiseUpPatternRow & { __patternKind?: RiseUpPatternKind }).__patternKind = kind;
  }
  for (const group of groupBy(incomeRows, (row) => patternKey(row, (row as RiseUpPatternRow & { __patternKind: RiseUpPatternKind }).__patternKind)).values()) {
    const kind = (group[0] as RiseUpPatternRow & { __patternKind: RiseUpPatternKind }).__patternKind;
    const pattern = buildPattern(kind, group, globalFirstMonth, globalLastMonth);
    if (pattern && (pattern.activeMonths >= 2 || pattern.totalAmount >= 5000)) patterns.push(pattern);
  }

  const expenseRows = datedRows.filter((row) => row.amount < 0);
  const typedExpenses = expenseRows
    .map((row) => ({ row, kind: expenseKind(row) }))
    .filter((item): item is { row: RiseUpPatternRow; kind: RiseUpPatternKind } => !!item.kind);
  for (const group of groupBy(typedExpenses, (item) => patternKey(item.row, item.kind)).values()) {
    const first = group[0];
    if (!first) continue;
    const pattern = buildPattern(
      first.kind,
      group.map((item) => item.row),
      globalFirstMonth,
      globalLastMonth,
    );
    if (!pattern) continue;
    if (pattern.kind === "installment_or_annual" || pattern.activeMonths >= 2 || pattern.rowCount >= 2) {
      patterns.push(pattern);
    }
  }

  return patterns.sort((a, b) => {
    const kindOrder = a.kind.localeCompare(b.kind);
    if (kindOrder !== 0) return kindOrder;
    return b.activeMonths - a.activeMonths || b.totalAmount - a.totalAmount;
  });
}

export function summarizeRiseUpPatterns(patterns: RiseUpDetectedPattern[]): RiseUpPatternSummary {
  const byKind: Record<string, number> = {};
  for (const pattern of patterns) {
    byKind[pattern.kind] = (byKind[pattern.kind] ?? 0) + 1;
  }
  const months = patterns.flatMap((pattern) => [pattern.firstMonth, pattern.lastMonth]).filter(Boolean).sort();
  const highlights = patterns
    .filter((pattern) => pattern.confidence !== "low")
    .sort((a, b) => b.activeMonths - a.activeMonths || b.totalAmount - a.totalAmount)
    .slice(0, 12);

  return {
    periodFirstMonth: months[0] ?? "",
    periodLastMonth: months[months.length - 1] ?? "",
    totalPatterns: patterns.length,
    byKind,
    highlights,
  };
}
