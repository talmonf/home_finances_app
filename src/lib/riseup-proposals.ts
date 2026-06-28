import type { RiseUpAnalyzedRow } from "@/lib/riseup-matching";
import type {
  RiseUpDetectedPattern,
  RiseUpEntityKind,
  RiseUpImportProposal,
  RiseUpProposalConfidence,
  RiseUpProposalKind,
  RiseUpProposalSummary,
  RiseUpProposalSupportRow,
} from "@/lib/riseup-commit-types";
import {
  analyzeRiseUpSubscriptions,
  getExportActiveMonth,
  subscriptionAnalysisSummary,
  subscriptionAnalysisToPayload,
  type SubscriptionAnalysisRow,
} from "@/lib/riseup-subscription-analysis";

function normalizeProposalName(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"`׳״]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type RowWithIdentity = RiseUpAnalyzedRow & {
  riseup_import_key: string;
  importStatus?: string;
};

function support(row: RowWithIdentity, role: RiseUpProposalSupportRow["support_role"]): RiseUpProposalSupportRow {
  return {
    rowIndex: row.rowIndex,
    riseup_import_key: row.riseup_import_key,
    support_role: role,
    confidence: "medium",
  };
}

function proposal(params: {
  clientKey: string;
  proposal_kind: RiseUpProposalKind;
  entity_kind: RiseUpEntityKind;
  target_entity_id?: string | null;
  confidence: RiseUpProposalConfidence;
  title: string;
  summary: string;
  payload_json?: Record<string, unknown>;
  proposed_changes_json?: Record<string, unknown>;
  supportRows: RiseUpProposalSupportRow[];
}): RiseUpImportProposal {
  return {
    id: undefined,
    clientKey: params.clientKey,
    proposal_kind: params.proposal_kind,
    entity_kind: params.entity_kind,
    target_entity_id: params.target_entity_id ?? null,
    status: "proposed",
    confidence: params.confidence,
    title: params.title,
    summary: params.summary,
    payload_json: params.payload_json ?? {},
    proposed_changes_json: params.proposed_changes_json ?? {},
    supportRows: params.supportRows,
  };
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

function toSubscriptionRow(row: RowWithIdentity): SubscriptionAnalysisRow {
  return {
    rowIndex: row.rowIndex,
    riseup_import_key: row.riseup_import_key,
    businessName: row.businessName,
    paymentDate: row.paymentDate,
    amount: row.amount,
    originalAmount: row.originalAmount,
    cashflowCategory: row.cashflowCategory,
    paymentMethodRaw: row.paymentMethodRaw,
    paymentIdentifierRaw: row.paymentIdentifierRaw,
    raw: row.raw,
    subscriptionSelectedId: row.subscription.selectedId,
  };
}

export function summarizeRiseUpProposals(proposals: RiseUpImportProposal[]): RiseUpProposalSummary {
  const byEntityKind: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};
  for (const p of proposals) {
    byEntityKind[p.entity_kind] = (byEntityKind[p.entity_kind] ?? 0) + 1;
    byConfidence[p.confidence] = (byConfidence[p.confidence] ?? 0) + 1;
  }
  return {
    total: proposals.length,
    byEntityKind,
    byConfidence,
  };
}

function proposalExists(proposals: RiseUpImportProposal[], clientKey: string): boolean {
  return proposals.some((p) => p.clientKey === clientKey);
}

function instrumentKey(row: RowWithIdentity): string {
  if (row.instrument.kind === "unknown") return "";
  return `${row.instrument.kind}:${normalizeProposalName(row.paymentMethodRaw)}:${row.paymentIdentifierRaw.trim()}`;
}

function similarSubscriptionProposalExists(
  proposals: RiseUpImportProposal[],
  canonicalName: string,
): boolean {
  const normalized = normalizeProposalName(canonicalName);
  return proposals.some((p) => {
    if (p.entity_kind !== "subscription") return false;
    const payloadName = String(
      p.payload_json.normalizedName ?? p.payload_json.suggestedName ?? p.title,
    );
    return normalizeProposalName(payloadName) === normalized;
  });
}

function patternEntityKind(pattern: RiseUpDetectedPattern): RiseUpEntityKind | null {
  if (pattern.kind === "work_income") return "job";
  if (pattern.kind === "subscription") return "subscription";
  if (pattern.kind === "insurance") return "insurance_policy";
  if (pattern.kind === "loan_return") return "loan";
  if (pattern.kind === "recurring_obligation") return "property_utility";
  if (pattern.kind === "petrol") return "car";
  return null;
}

function patternLabel(pattern: RiseUpDetectedPattern): string {
  if (pattern.kind === "work_income") return "Work income source";
  if (pattern.kind === "subscription") return "Recurring subscription";
  if (pattern.kind === "insurance") return "Insurance policy";
  if (pattern.kind === "loan_return") return "Loan repayment";
  if (pattern.kind === "recurring_obligation") return "Recurring household obligation";
  if (pattern.kind === "petrol") return "Petrol / car expense pattern";
  return "RiseUp pattern";
}

function similarProposalExists(
  proposals: RiseUpImportProposal[],
  entityKind: RiseUpEntityKind,
  title: string,
): boolean {
  const normalizedTitle = normalizeProposalName(title);
  return proposals.some((p) => {
    if (p.entity_kind !== entityKind) return false;
    const suggestedName = String(p.payload_json.suggestedName ?? p.payload_json.providerName ?? p.title);
    return normalizeProposalName(suggestedName) === normalizedTitle;
  });
}

function generateSubscriptionProposals(
  rows: RowWithIdentity[],
  allRows: RowWithIdentity[],
  existing: RiseUpImportProposal[],
): RiseUpImportProposal[] {
  const out: RiseUpImportProposal[] = [];
  const exportActiveMonth = getExportActiveMonth(allRows.map(toSubscriptionRow));
  const analyses = analyzeRiseUpSubscriptions(allRows.map(toSubscriptionRow));

  for (const analysis of analyses) {
    if (analysis.confidence === "low") continue;
    const supportRows = rows
      .filter((row) => analysis.supportRowIndexes.includes(row.rowIndex))
      .filter((row) => !row.subscription.selectedId);
    if (supportRows.length === 0) continue;

    const clientKey = `subscription:${normalizeProposalName(analysis.canonicalName)}:${analysis.perPaymentAmount.toFixed(2)}`;
    if (proposalExists(existing, clientKey) || proposalExists(out, clientKey)) continue;
    if (similarSubscriptionProposalExists(existing, analysis.canonicalName)) continue;
    if (similarSubscriptionProposalExists(out, analysis.canonicalName)) continue;

    out.push(
      proposal({
        clientKey,
        proposal_kind: "create_entity",
        entity_kind: "subscription",
        confidence: analysis.confidence as RiseUpProposalConfidence,
        title: `Subscription: ${analysis.displayName}`,
        summary: subscriptionAnalysisSummary(analysis),
        payload_json: subscriptionAnalysisToPayload(analysis, exportActiveMonth),
        proposed_changes_json: {
          source: "riseup_subscription_analysis",
          reviewWorkExpense: true,
        },
        supportRows: supportRows.slice(0, 25).map((r) => support(r, "recurring_instance")),
      }),
    );
  }
  return out;
}

function generatePatternProposals(
  patterns: RiseUpDetectedPattern[],
  existing: RiseUpImportProposal[],
): RiseUpImportProposal[] {
  const out: RiseUpImportProposal[] = [];
  for (const pattern of patterns) {
    const entityKind = patternEntityKind(pattern);
    if (!entityKind) continue;
    if (pattern.confidence === "low") continue;
    if (pattern.kind === "subscription") continue;
    const clientKey = `pattern:${pattern.kind}:${pattern.key}`;
    if (proposalExists(existing, clientKey) || proposalExists(out, clientKey)) continue;
    if (similarProposalExists(existing, entityKind, pattern.title)) continue;
    out.push(
      proposal({
        clientKey,
        proposal_kind: "create_entity",
        entity_kind: entityKind,
        confidence: pattern.confidence,
        title: `${patternLabel(pattern)}: ${pattern.title}`,
        summary: `${pattern.rowCount} rows across ${pattern.activeMonths} active months (${pattern.firstMonth} to ${pattern.lastMonth}); avg ${pattern.averageAmount}, median ${pattern.medianAmount}.`,
        payload_json: {
          suggestedName: pattern.title,
          patternKind: pattern.kind,
          firstMonth: pattern.firstMonth,
          lastMonth: pattern.lastMonth,
          activeMonths: pattern.activeMonths,
          averageAmount: pattern.averageAmount,
          medianAmount: pattern.medianAmount,
          totalAmount: pattern.totalAmount,
          startedDuringPeriod: pattern.startedDuringPeriod,
          endedDuringPeriod: pattern.endedDuringPeriod,
          ...pattern.metadata,
        },
        proposed_changes_json: {
          source: "riseup_cross_row_pattern",
          reviewReason: pattern.reviewReason ?? null,
        },
        supportRows: pattern.supportRows,
      }),
    );
  }
  return out;
}

export function generateRiseUpImportProposals(
  rows: RowWithIdentity[],
  patterns: RiseUpDetectedPattern[] = [],
): RiseUpImportProposal[] {
  const proposals: RiseUpImportProposal[] = [];
  const actionableRows = rows.filter((r) => r.importStatus !== "existing");

  for (const [key, group] of groupBy(actionableRows, instrumentKey)) {
    const first = group[0];
    if (!first || first.instrument.selectedId || first.instrument.candidates.length > 0) continue;
    proposals.push(
      proposal({
        clientKey: `instrument:${key}`,
        proposal_kind: "create_entity",
        entity_kind: first.instrument.kind === "credit_card" ? "credit_card" : "bank_account",
        confidence: "medium",
        title:
          first.instrument.kind === "credit_card"
            ? `New credit card: ${first.paymentMethodRaw} ${first.paymentIdentifierRaw}`
            : `New bank account: ${first.paymentMethodRaw} ${first.paymentIdentifierRaw}`,
        summary: `${group.length} transactions use this unknown payment instrument.`,
        payload_json: {
          paymentMethodRaw: first.paymentMethodRaw,
          paymentIdentifierRaw: first.paymentIdentifierRaw,
          sourceKind: first.sourceKind,
        },
        supportRows: group.slice(0, 25).map((r) => support(r, "evidence")),
      }),
    );
  }

  for (const [name, group] of groupBy(actionableRows.filter((r) => !r.payee.selectedId), (r) => normalizeProposalName(r.businessName))) {
    const first = group[0];
    if (!first || name.length < 2) continue;
    proposals.push(
      proposal({
        clientKey: `payee:${name}`,
        proposal_kind: "payee_cluster",
        entity_kind: "payee",
        confidence: group.length >= 3 ? "high" : "medium",
        title: `New payee: ${first.businessName}`,
        summary: `${group.length} transactions can support a reviewed payee/alias cluster.`,
        payload_json: {
          suggestedName: first.businessName,
          aliases: Array.from(new Set(group.map((r) => r.businessName))).slice(0, 12),
        },
        supportRows: group.slice(0, 25).map((r) => support(r, "evidence")),
      }),
    );
  }

  for (const [cat, group] of groupBy(actionableRows.filter((r) => !r.category.selectedId), (r) => r.cashflowCategory.trim())) {
    if (!cat) continue;
    proposals.push(
      proposal({
        clientKey: `category:${normalizeProposalName(cat)}`,
        proposal_kind: "category_mapping",
        entity_kind: "category",
        confidence: "medium",
        title: `Map or create category: ${cat}`,
        summary: `${group.length} transactions use this RiseUp category without an app category match.`,
        payload_json: { riseUpCategory: cat, suggestedName: cat },
        supportRows: group.slice(0, 25).map((r) => support(r, "evidence")),
      }),
    );
  }

  for (const [key, group] of groupBy(actionableRows.filter((r) => !!r.utilityCategoryHint && !r.utility.selectedId), (r) => `${r.utilityCategoryHint}:${normalizeProposalName(r.businessName)}`)) {
    const first = group[0];
    if (!first) continue;
    proposals.push(
      proposal({
        clientKey: `utility:${key}`,
        proposal_kind: "create_entity",
        entity_kind: "property_utility",
        confidence: group.length >= 2 ? "high" : "medium",
        title: `Utility account: ${first.businessName}`,
        summary: `${group.length} transactions look like ${first.utilityCategoryHint} utility payments.`,
        payload_json: {
          providerName: first.businessName,
          utilityType: first.utilityCategoryHint,
          propertyId: null,
        },
        supportRows: group.slice(0, 25).map((r) => support(r, "evidence")),
      }),
    );
  }

  const domainPatterns: Array<{
    entity_kind: RiseUpEntityKind;
    label: string;
    predicate: (row: RowWithIdentity) => boolean;
  }> = [
    { entity_kind: "donation", label: "Donation commitment", predicate: (r) => /תרומה/i.test(r.cashflowCategory) && !r.donation.selectedId },
    { entity_kind: "insurance_policy", label: "Insurance policy", predicate: (r) => /ביטוח/i.test(r.cashflowCategory) && !r.insurance.selectedId },
    { entity_kind: "savings_policy", label: "Savings policy", predicate: (r) => /חסכ|חסכונות|גמל|פנס|השתלמות|פיקדון|פקדון|השקעה|לא תזרימיות/i.test(`${r.cashflowCategory} ${r.businessName}`) },
    { entity_kind: "car", label: "Car expense cluster", predicate: (r) => /רכב|דלק|חניה|כביש/i.test(`${r.cashflowCategory} ${r.businessName}`) },
  ];

  for (const pattern of domainPatterns) {
    for (const [name, group] of groupBy(actionableRows.filter(pattern.predicate), (r) => normalizeProposalName(r.businessName))) {
      const first = group[0];
      if (!first || name.length < 2) continue;
      proposals.push(
        proposal({
          clientKey: `${pattern.entity_kind}:${name}`,
          proposal_kind: "create_entity",
          entity_kind: pattern.entity_kind,
          confidence: group.length >= 3 ? "high" : "medium",
          title: `${pattern.label}: ${first.businessName}`,
          summary: `${group.length} transactions support this staged ${pattern.entity_kind} proposal.`,
          payload_json: {
            suggestedName: first.businessName,
            amountPattern: Math.abs(first.originalAmount ?? first.amount),
            cashflowCategory: first.cashflowCategory,
          },
          supportRows: group.slice(0, 25).map((r) => support(r, group.length >= 2 ? "recurring_instance" : "evidence")),
        }),
      );
    }
  }

  proposals.push(...generateSubscriptionProposals(actionableRows, rows, proposals));
  proposals.push(...generatePatternProposals(patterns, proposals));

  return proposals;
}
