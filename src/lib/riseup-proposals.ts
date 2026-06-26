import type { RiseUpAnalyzedRow } from "@/lib/riseup-matching";
import type {
  RiseUpEntityKind,
  RiseUpImportProposal,
  RiseUpProposalConfidence,
  RiseUpProposalKind,
  RiseUpProposalSummary,
  RiseUpProposalSupportRow,
} from "@/lib/riseup-commit-types";

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

function months(rows: RowWithIdentity[]): Set<string> {
  return new Set(rows.map((r) => r.paymentDate.slice(0, 7)).filter(Boolean));
}

function amountBucket(row: RowWithIdentity): string {
  return Math.abs(row.originalAmount ?? row.amount).toFixed(0);
}

function instrumentKey(row: RowWithIdentity): string {
  if (row.instrument.kind === "unknown") return "";
  return `${row.instrument.kind}:${normalizeProposalName(row.paymentMethodRaw)}:${row.paymentIdentifierRaw.trim()}`;
}

function recurringGroups(rows: RowWithIdentity[]): Map<string, RowWithIdentity[]> {
  return groupBy(
    rows.filter((r) => Math.abs(r.amount) > 0),
    (r) => `${normalizeProposalName(r.businessName)}:${amountBucket(r)}:${instrumentKey(r)}`,
  );
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

export function generateRiseUpImportProposals(rows: RowWithIdentity[]): RiseUpImportProposal[] {
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

  for (const [key, group] of recurringGroups(actionableRows)) {
    if (group.length < 2 || months(group).size < 2) continue;
    const first = group[0]!;
    const normalizedName = normalizeProposalName(first.businessName);
    if (!first.subscription.selectedId && !/תרומה|ביטוח|הלווא|חשמל|מים|ארנונה|גז|סופר|דלק|רכב/.test(first.cashflowCategory)) {
      proposals.push(
        proposal({
          clientKey: `subscription:${key}`,
          proposal_kind: "create_entity",
          entity_kind: "subscription",
          confidence: group.length >= 4 ? "high" : "medium",
          title: `Recurring subscription: ${first.businessName}`,
          summary: `${group.length} recurring payments across ${months(group).size} months.`,
          payload_json: {
            suggestedName: first.businessName,
            normalizedName,
            amount: Math.abs(first.originalAmount ?? first.amount),
            paymentMethodRaw: first.paymentMethodRaw,
          },
          supportRows: group.slice(0, 25).map((r) => support(r, "recurring_instance")),
        }),
      );
    }
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
    { entity_kind: "job", label: "Income source", predicate: (r) => r.transactionDirection === "credit" && /הכנסות|משכורת|שכר/i.test(`${r.cashflowCategory} ${r.businessName}`) && !r.job.selectedId },
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

  return proposals;
}
