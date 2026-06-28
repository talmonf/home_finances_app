/**
 * RiseUp subscription detection rules (export window, totals, dual-annual, name merges).
 */

export type SubscriptionAnalysisRow = {
  rowIndex: number;
  riseup_import_key: string;
  businessName: string;
  paymentDate: string;
  amount: number;
  originalAmount: number | null;
  cashflowCategory: string;
  paymentMethodRaw: string;
  paymentIdentifierRaw: string;
  raw: Record<string, string>;
  subscriptionSelectedId?: string | null;
};

export type RiseUpSubscriptionAnalysis = {
  canonicalName: string;
  displayName: string;
  mergedFrom: string[];
  frequency: "monthly" | "yearly";
  billingInterval: "monthly" | "annual";
  perPaymentAmount: number;
  avgMonthlyAmount: number;
  totalPaidInExport: number;
  yearlyTotalAmount: number;
  yearlyTotalNote?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  paymentCount: number;
  annualFamilyMembers?: number;
  paymentMethodRaw: string;
  paymentIdentifierRaw: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  supportRowIndexes: number[];
};

const SUBSCRIPTION_CATEGORIES = new Set(["דיגיטל", "מנויים", "תקשורת"]);

const EXCLUDE_CATEGORY_PATTERNS = [
  "סופר",
  "תרומה",
  "ביטוח",
  "בריאות",
  "ארנונה",
  "מים",
  "חינוך",
  "ילדים",
  "עמלות",
  "הלוואה",
  "ביטוח לאומי",
  "הכנסות",
  "תשלומים",
  "ים סוף",
  "הוצאות לא תזרימיות",
];

const EXCLUDE_MERCHANT_PATTERNS = [
  /תרומ/u,
  /גמ["']?ח/u,
  /קופ["']?ח/u,
  /מגדל/u,
  /מנורה/u,
  /כלל חברה/u,
  /עיריית/u,
  /מי ה/u,
  /חשמל/u,
  /מאיר פנים/u,
  /רפאנו/u,
  /תקוה/u,
  /להושיט/u,
  /צביה/u,
  /קרית/u,
  /מפעל הפיס/u,
  /העברה/u,
  /פזגז/u,
  /בן דוד/u,
  /רואי חשב/u,
  /PAYBOX/i,
  /דמי כרטיס/u,
  /הסתדרות/u,
  /ILS USD/u,
  /מינימרקט/u,
  /שופרסל/u,
  /רמי לוי/u,
  /מרקט/u,
  /סטוקי/u,
  /ממתק/u,
  /מ ש ג ב/u,
];

const MERGE_ALIASES: Record<string, string[]> = {
  "Claude AI": ["CLAUDE", "ANTHROPIC"],
  "Cursor IDE": ["CURSOR"],
  "OpenAI / ChatGPT": ["OPENAI", "CHATGPT"],
  "Google YouTube Premium": ["YOUTUBE"],
  "Google One": ["GOOGLE ONE"],
  "Google Leap Fitness": ["LEAP FITNESS"],
  "Google Fasting app": ["FASTING"],
  "Google Call Recorder": ["CALL RECORDER"],
  "Apple iCloud / App Store": ["APPLE.COM"],
  "LinkedIn Premium": ["LINKEDIN"],
  Zoom: ["ZOOM"],
  Canva: ["CANVA"],
  "Render.com": ["RENDER"],
  Vysor: ["VYSOR"],
  "RiseUp app": ["RISEUP", "RISE UP", "מנוי RISEUP", "מנוי riseup"],
  "Makor Rishon newspaper": ["מקור ראשון"],
  "Midah website": ["אתר מידה"],
  "Israeli Tanakh app": ["תנך ישראלי"],
  "Panima / Otiyot / Mada VTevel": ["פנימה", "אותיות"],
  "Telrom-Koter": ["טלרום"],
  Bezeq: ["בזק", "B בזק"],
  "Partner Mobile": ["פרטנר"],
  TribalPages: ["TRIBAL"],
};

const KNOWN_SUBSCRIPTION_CANONICAL = new Set(Object.keys(MERGE_ALIASES));

const SUBSCRIPTION_KEYWORDS = [
  "premium",
  "netflix",
  "spotify",
  "youtube",
  "cursor",
  "google",
  "microsoft",
  "adobe",
  "icloud",
  "subscription",
  "claude",
  "openai",
  "chatgpt",
  "canva",
  "zoom",
  "render",
  "vysor",
  "linkedin",
  "מנוי",
  "דמי חבר",
  "הוראת קבע",
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function paymentAmount(row: SubscriptionAnalysisRow): number {
  return Math.abs(row.originalAmount ?? row.amount);
}

function parsePaymentDate(date: string): Date | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getExportActiveMonth(rows: SubscriptionAnalysisRow[]): string | null {
  let max: Date | null = null;
  for (const row of rows) {
    const d = parsePaymentDate(row.paymentDate);
    if (!d) continue;
    if (!max || d > max) max = d;
  }
  return max ? max.toISOString().slice(0, 7) : null;
}

export function isPaidInExportActiveMonth(paymentDate: string, activeMonth: string | null): boolean {
  if (!activeMonth || !paymentDate) return false;
  return paymentDate.slice(0, 7) === activeMonth;
}

export function isRiseUpInstallmentPlan(raw: Record<string, string>): boolean {
  const payNum = String(raw["מספר התשלום"] ?? "").trim();
  const payTotal = String(raw["מספר תשלומים כולל"] ?? "").trim();
  if (!payNum || !payTotal) return false;
  const n = Number(payNum);
  const t = Number(payTotal);
  return Number.isFinite(n) && Number.isFinite(t) && t > 1 && n <= t;
}

export function canonicalSubscriptionName(businessName: string): string {
  const upper = businessName.toUpperCase().trim();
  for (const [canon, patterns] of Object.entries(MERGE_ALIASES)) {
    for (const pattern of patterns) {
      if (upper.includes(pattern.toUpperCase())) return canon;
    }
  }
  if (/בזק/u.test(businessName) && /הוראת/u.test(businessName)) return "Bezeq standing order";
  if (/פרטנר/u.test(businessName)) return "Partner Mobile";
  return upper.replace(/\s+/g, " ").slice(0, 60);
}

function isExcludedMerchant(businessName: string, category: string): boolean {
  if (EXCLUDE_CATEGORY_PATTERNS.some((p) => category.includes(p))) return true;
  return EXCLUDE_MERCHANT_PATTERNS.some((p) => p.test(businessName));
}

function hasSubscriptionKeyword(businessName: string): boolean {
  const lower = businessName.toLowerCase();
  return SUBSCRIPTION_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function isSubscriptionCandidateRow(row: SubscriptionAnalysisRow): boolean {
  if (row.amount >= 0) return false;
  if (isRiseUpInstallmentPlan(row.raw)) return false;
  if (isExcludedMerchant(row.businessName, row.cashflowCategory)) return false;
  if (SUBSCRIPTION_CATEGORIES.has(row.cashflowCategory)) return true;
  const canon = canonicalSubscriptionName(row.businessName);
  if (KNOWN_SUBSCRIPTION_CANONICAL.has(canon)) return true;
  if (/הוראת קבע/u.test(row.businessName) && (/בזק/u.test(row.businessName) || /פרטנר/u.test(row.businessName))) {
    return true;
  }
  if (/דמי חבר/u.test(row.businessName)) return true;
  if (/מנוי/u.test(row.businessName) || /subscription/i.test(row.businessName)) return true;
  return hasSubscriptionKeyword(row.businessName);
}

function clusterByAmount(rows: SubscriptionAnalysisRow[], tolerance = 0.12): SubscriptionAnalysisRow[][] {
  const sorted = [...rows].sort((a, b) => paymentAmount(a) - paymentAmount(b));
  const clusters: SubscriptionAnalysisRow[][] = [];
  for (const row of sorted) {
    const amt = paymentAmount(row);
    let placed = false;
    for (const cluster of clusters) {
      const avg = cluster.reduce((s, r) => s + paymentAmount(r), 0) / cluster.length;
      if (Math.abs(amt - avg) / avg <= tolerance) {
        cluster.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([row]);
  }
  return clusters;
}

function dayIntervals(dates: Date[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    out.push(Math.round((dates[i]!.getTime() - dates[i - 1]!.getTime()) / 86_400_000));
  }
  return out;
}

function paymentsPerCalendarYear(dated: SubscriptionAnalysisRow[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const row of dated) {
    const d = parsePaymentDate(row.paymentDate);
    if (!d) continue;
    counts[d.getUTCFullYear()] = (counts[d.getUTCFullYear()] ?? 0) + 1;
  }
  return counts;
}

function inferDualAnnualMembers(
  dated: SubscriptionAnalysisRow[],
  intervals: number[],
): number | null {
  if (dated.length < 2) return null;
  const byYear = paymentsPerCalendarYear(dated);
  const years = Object.keys(byYear).map(Number);
  if (!years.length) return null;
  const avgPerYear = years.reduce((s, y) => s + byYear[y]!, 0) / years.length;
  if (avgPerYear < 1.4 || avgPerYear > 2.6) return null;
  if (intervals.length && intervals.filter((i) => i <= 45).length / intervals.length > 0.5) return null;
  const amounts = dated.map(paymentAmount);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (avg <= 0 || (Math.max(...amounts) - Math.min(...amounts)) / avg > 0.2) return null;
  return 2;
}

function detectFrequency(
  intervals: number[],
  dated: SubscriptionAnalysisRow[],
  dualMembers: number | null,
): "monthly" | "yearly" {
  if (dualMembers) return "yearly";
  if (!intervals.length) return "monthly";
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (avg >= 300) return "yearly";
  if (avg >= 150 && dated.length <= 4) return "yearly";
  if (avg >= 150) return "yearly";
  return "monthly";
}

function computeYearlyTotal(params: {
  frequency: "monthly" | "yearly";
  perPayment: number;
  totalPaid: number;
  isActive: boolean;
  dualMembers: number | null;
}): { yearlyTotal: number; note?: string } {
  const { frequency, perPayment, totalPaid, isActive, dualMembers } = params;
  if (frequency === "monthly" && isActive) {
    return { yearlyTotal: round2(perPayment * 12) };
  }
  if (frequency === "yearly" && dualMembers) {
    return { yearlyTotal: round2(perPayment * dualMembers) };
  }
  if (frequency === "yearly" && isActive) {
    return { yearlyTotal: round2(perPayment) };
  }
  if (frequency === "yearly" && !isActive) {
    return { yearlyTotal: round2(perPayment) };
  }
  return {
    yearlyTotal: round2(totalPaid),
    note:
      "Actual sum in export only — not projected to a full year because the subscription was not active in the export's last month.",
  };
}

function subscriptionReason(
  canon: string,
  category: string,
  businessName: string,
  frequency: string,
  paymentCount: number,
  dualMembers: number | null,
): string {
  const parts: string[] = [];
  if (KNOWN_SUBSCRIPTION_CANONICAL.has(canon)) parts.push("known subscription service (merged merchant names)");
  if (SUBSCRIPTION_CATEGORIES.has(category)) parts.push(`RiseUp category '${category}'`);
  if (/הוראת קבע/u.test(businessName)) parts.push("telecom standing order (הוראת קבע)");
  if (/דמי חבר/u.test(businessName)) parts.push("membership fee (דמי חבר)");
  if (/מנוי/u.test(businessName) || /subscription/i.test(businessName)) {
    parts.push("'subscription' or 'מנוי' in merchant name");
  }
  if (dualMembers) {
    parts.push(`~${dualMembers} payments per year — likely annual plan for ${dualMembers} family members`);
  }
  if (!parts.length) parts.push(`${frequency} recurring pattern (${paymentCount} payments)`);
  return parts.join("; ");
}

export function analyzeSubscriptionCluster(
  rows: SubscriptionAnalysisRow[],
  activeMonth: string | null,
): RiseUpSubscriptionAnalysis | null {
  const dated = [...rows]
    .filter((r) => parsePaymentDate(r.paymentDate))
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
  if (!dated.length) return null;

  const canon = canonicalSubscriptionName(dated[0]!.businessName);
  const known = KNOWN_SUBSCRIPTION_CANONICAL.has(canon);
  const minPayments = known || /דמי חבר/u.test(dated[0]!.businessName) ? 1 : 2;
  if (dated.length < minPayments) return null;
  if (!isSubscriptionCandidateRow(dated[0]!)) return null;

  const amounts = dated.map(paymentAmount);
  const totalPaid = amounts.reduce((a, b) => a + b, 0);
  const perPayment = totalPaid / amounts.length;
  const dates = dated.map((r) => parsePaymentDate(r.paymentDate)!);
  const intervals = dayIntervals(dates);
  const dualMembers = inferDualAnnualMembers(dated, intervals);
  const frequency = detectFrequency(intervals, dated, dualMembers);
  const isActive = dated.some((r) => isPaidInExportActiveMonth(r.paymentDate, activeMonth));

  const { yearlyTotal, note } = computeYearlyTotal({
    frequency,
    perPayment: round2(perPayment),
    totalPaid: round2(totalPaid),
    isActive,
    dualMembers,
  });

  const avgMonthly =
    frequency === "monthly"
      ? round2(perPayment)
      : dualMembers
        ? round2((perPayment * dualMembers) / 12)
        : round2(perPayment / 12);

  const altNames = [...new Set(dated.map((r) => r.businessName))];
  const displayName = known ? canon : dated[0]!.businessName;

  const instCounts = new Map<string, number>();
  for (const r of dated) {
    const k = `${r.paymentMethodRaw}:${r.paymentIdentifierRaw}`;
    instCounts.set(k, (instCounts.get(k) ?? 0) + 1);
  }
  const topInst = [...instCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ":";
  const [paymentMethodRaw, paymentIdentifierRaw] = topInst.split(":");

  let confidence: "high" | "medium" | "low" = "medium";
  if (dated.length >= 3 && (known || SUBSCRIPTION_CATEGORIES.has(dated[0]!.cashflowCategory))) {
    confidence = "high";
  } else if (dated.length < 2 && !known) {
    confidence = "low";
  }

  return {
    canonicalName: canon,
    displayName,
    mergedFrom: altNames.length > 1 ? altNames : [],
    frequency,
    billingInterval: frequency === "yearly" ? "annual" : "monthly",
    perPaymentAmount: round2(perPayment),
    avgMonthlyAmount: avgMonthly,
    totalPaidInExport: round2(totalPaid),
    yearlyTotalAmount: yearlyTotal,
    yearlyTotalNote: note,
    isActive,
    startDate: dated[0]!.paymentDate,
    endDate: isActive ? "ongoing" : dated[dated.length - 1]!.paymentDate,
    paymentCount: dated.length,
    annualFamilyMembers: dualMembers ?? undefined,
    paymentMethodRaw: paymentMethodRaw ?? "",
    paymentIdentifierRaw: paymentIdentifierRaw ?? "",
    reason: subscriptionReason(
      canon,
      dated[0]!.cashflowCategory,
      dated[0]!.businessName,
      frequency,
      dated.length,
      dualMembers,
    ),
    confidence,
    supportRowIndexes: dated.map((r) => r.rowIndex),
  };
}

export function analyzeRiseUpSubscriptions(
  rows: SubscriptionAnalysisRow[],
): RiseUpSubscriptionAnalysis[] {
  const activeMonth = getExportActiveMonth(rows);
  const candidates = rows.filter(isSubscriptionCandidateRow);
  const byCanon = new Map<string, SubscriptionAnalysisRow[]>();
  for (const row of candidates) {
    const canon = canonicalSubscriptionName(row.businessName);
    byCanon.set(canon, [...(byCanon.get(canon) ?? []), row]);
  }

  const results: RiseUpSubscriptionAnalysis[] = [];
  for (const group of byCanon.values()) {
    for (const cluster of clusterByAmount(group)) {
      const analysis = analyzeSubscriptionCluster(cluster, activeMonth);
      if (analysis) results.push(analysis);
    }
  }

  return results.sort((a, b) => b.yearlyTotalAmount - a.yearlyTotalAmount || a.displayName.localeCompare(b.displayName));
}

export function patternEndedDuringExport(
  lastPaymentMonth: string,
  exportActiveMonth: string | null,
  paidInActiveMonth: boolean,
): boolean {
  if (!exportActiveMonth || !lastPaymentMonth) return false;
  if (paidInActiveMonth) return false;
  return lastPaymentMonth < exportActiveMonth;
}

export function subscriptionAnalysisToPayload(
  analysis: RiseUpSubscriptionAnalysis,
  exportActiveMonth: string | null,
): Record<string, unknown> {
  return {
    suggestedName: analysis.displayName,
    normalizedName: analysis.canonicalName,
    aliases: analysis.mergedFrom.slice(0, 12),
    amount: analysis.perPaymentAmount,
    perPaymentAmount: analysis.perPaymentAmount,
    avgMonthlyAmount: analysis.avgMonthlyAmount,
    totalPaidInExport: analysis.totalPaidInExport,
    yearlyTotalAmount: analysis.yearlyTotalAmount,
    yearlyTotalNote: analysis.yearlyTotalNote ?? null,
    billingInterval: analysis.billingInterval,
    frequency: analysis.frequency,
    isActive: analysis.isActive,
    startDate: analysis.startDate,
    endDate: analysis.endDate,
    paymentCount: analysis.paymentCount,
    annualFamilyMembers: analysis.annualFamilyMembers ?? null,
    exportActiveMonth,
    paymentMethodRaw: analysis.paymentMethodRaw,
    paymentIdentifierRaw: analysis.paymentIdentifierRaw,
    reason: analysis.reason,
    familyMemberId: null,
    jobId: null,
    isWorkExpense: false,
  };
}

export function subscriptionAnalysisSummary(analysis: RiseUpSubscriptionAnalysis): string {
  const status = analysis.isActive ? "ongoing" : `last paid ${analysis.endDate}`;
  const members =
    analysis.annualFamilyMembers != null
      ? `; ~${analysis.annualFamilyMembers} annual seats`
      : "";
  const yearlyNote = analysis.yearlyTotalNote ? ` (${analysis.yearlyTotalNote})` : "";
  return (
    `${analysis.paymentCount} payments, ${analysis.frequency}, ` +
    `₪${analysis.perPaymentAmount.toFixed(2)}/payment, ` +
    `₪${analysis.totalPaidInExport.toFixed(2)} paid in export, ` +
    `₪${analysis.yearlyTotalAmount.toFixed(2)} yearly${yearlyNote}; ${status}${members}.`
  );
}
