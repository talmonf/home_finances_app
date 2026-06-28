"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { RiseUpAnalyzedRow } from "@/lib/riseup-matching";
import type {
  RiseUpAnalyzeSummary,
  RiseUpCommitRowPayload,
  RiseUpExistingTransactionSummary,
  RiseUpImportAction,
  RiseUpImportDiff,
  RiseUpImportProposal,
  RiseUpCommitProposalPayload,
  RiseUpImportRowStatus,
} from "@/lib/riseup-commit-types";
import {
  SubscriptionFamilyJobSelects,
  type SubscriptionFamilyJobSelectJob,
  type SubscriptionFamilyJobSelectMember,
} from "@/components/subscription-family-job-selects";

type Props = {
  uiLanguage: "en" | "he";
  bankAccounts: { id: string; label: string }[];
  creditCards: { id: string; label: string }[];
  familyMembers: SubscriptionFamilyJobSelectMember[];
  jobs: SubscriptionFamilyJobSelectJob[];
};

type RiseUpAnalyzedImportRow = RiseUpAnalyzedRow & {
  riseup_import_key: string;
  riseup_content_hash: string;
  riseup_identity_basis: "native" | "fallback";
  importStatus: RiseUpImportRowStatus;
  existingTransaction: RiseUpExistingTransactionSummary | null;
  changedFields: RiseUpImportDiff[];
};

type RiseUpResetPreview = {
  totalRiseUpTransactions: number;
  enrichedTransactions: number;
  downstreamLinkCount: number;
  blocked: boolean;
  message: string;
  downstreamLinks: Record<string, number>;
  genericLinkCount?: number;
  proposalCount?: number;
};

type RiseUpProposalWorkExpenseDraft = {
  isWorkExpense: boolean;
  familyMemberId: string;
  jobId: string;
};

function proposalWorkExpenseDraft(
  proposal: RiseUpImportProposal,
  existing?: RiseUpProposalWorkExpenseDraft,
): RiseUpProposalWorkExpenseDraft {
  const payload = proposal.payload_json;
  return {
    isWorkExpense: existing?.isWorkExpense ?? Boolean(payload.isWorkExpense ?? payload.jobId),
    familyMemberId: existing?.familyMemberId ?? String(payload.familyMemberId ?? ""),
    jobId: existing?.jobId ?? String(payload.jobId ?? ""),
  };
}

function subscriptionProposalDetailLines(
  proposal: RiseUpImportProposal,
  isHe: boolean,
): string[] {
  if (proposal.entity_kind !== "subscription") return [];
  const p = proposal.payload_json;
  const lines: string[] = [];
  const interval = p.billingInterval === "annual" ? (isHe ? "שנתי" : "annual") : isHe ? "חודשי" : "monthly";
  if (p.perPaymentAmount != null) {
    lines.push(
      isHe
        ? `תשלום: ₪${Number(p.perPaymentAmount).toFixed(2)} (${interval})`
        : `Payment: ₪${Number(p.perPaymentAmount).toFixed(2)} (${interval})`,
    );
  }
  if (p.yearlyTotalAmount != null) {
    lines.push(
      isHe
        ? `סה״כ שנתי משוער: ₪${Number(p.yearlyTotalAmount).toFixed(2)}`
        : `Est. yearly total: ₪${Number(p.yearlyTotalAmount).toFixed(2)}`,
    );
  }
  if (p.totalPaidInExport != null) {
    lines.push(
      isHe
        ? `שולם בייצוא: ₪${Number(p.totalPaidInExport).toFixed(2)} (${p.paymentCount ?? "?"} תשלומים)`
        : `Paid in export: ₪${Number(p.totalPaidInExport).toFixed(2)} (${p.paymentCount ?? "?"} payments)`,
    );
  }
  if (p.isActive === true) {
    lines.push(isHe ? "סטטוס: פעיל (תשלום בחודש האחרון בייצוא)" : "Status: active (paid in export's last month)");
  } else if (p.endDate) {
    lines.push(isHe ? `סיום/אחרון: ${p.endDate}` : `Last/end: ${p.endDate}`);
  }
  if (p.annualFamilyMembers != null) {
    lines.push(
      isHe
        ? `מנוי שנתי ל-${p.annualFamilyMembers} בני משפחה`
        : `Annual plan for ~${p.annualFamilyMembers} family members`,
    );
  }
  return lines;
}

const subscriptionSelectClass =
  "w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100";

type RiseUpWizardSection =
  | "instruments"
  | "core_mappings"
  | "domain_entities"
  | "transaction_actions"
  | "historical_backfill";

function buildCommitPayload(
  rows: RiseUpAnalyzedImportRow[],
  overrides: Record<
    number,
    {
      bank_account_id: string | null;
      credit_card_id: string | null;
      payee_id: string | null;
      new_payee_name: string;
      category_id: string | null;
      job_id: string | null;
      subscription_id: string | null;
      loan_id: string | null;
    }
  >,
  actions: Record<number, RiseUpImportAction>,
): RiseUpCommitRowPayload[] {
  return rows.map((r) => {
    const o = overrides[r.rowIndex];
    return {
      rowIndex: r.rowIndex,
      riseup_import_key: r.riseup_import_key,
      riseup_content_hash: r.riseup_content_hash,
      import_action: actions[r.rowIndex] ?? "skip",
      businessName: r.businessName,
      paymentMethodRaw: r.paymentMethodRaw,
      paymentIdentifierRaw: r.paymentIdentifierRaw,
      paymentDate: r.paymentDate,
      chargeDate: r.chargeDate,
      amount: r.amount,
      originalAmount: r.originalAmount,
      sourceKind: String(r.sourceKind),
      cashflowCategory: r.cashflowCategory,
      isZeroAmountPending: r.isZeroAmountPending,
      raw: r.raw,
      bank_account_id: o.bank_account_id,
      credit_card_id: o.credit_card_id,
      payee_id: o.payee_id || null,
      new_payee_name: o.new_payee_name?.trim() || null,
      category_id: o.category_id,
      job_id: o.job_id,
      subscription_id: o.subscription_id,
      loan_id: o.loan_id,
    };
  });
}

function instrumentValue(o: {
  bank_account_id: string | null;
  credit_card_id: string | null;
}): string {
  if (o.bank_account_id) return `bank:${o.bank_account_id}`;
  if (o.credit_card_id) return `card:${o.credit_card_id}`;
  return "";
}

function patternKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    payment_instrument: "instrument",
    work_income: "work income",
    benefit_income: "benefit income",
    transfer_or_refund_income: "transfer/refund",
    subscription: "subscription",
    recurring_obligation: "recurring bill",
    insurance: "insurance",
    loan_return: "loan return",
    installment_or_annual: "installment/annual",
    petrol: "petrol",
    petrol_review: "petrol review",
  };
  return labels[kind] ?? kind;
}

export function RiseUpImportFlow({
  uiLanguage,
  bankAccounts,
  creditCards,
  familyMembers,
  jobs,
}: Props) {
  const router = useRouter();
  const isHe = uiLanguage === "he";
  const [file, setFile] = useState<File | null>(null);
  const [analyzed, setAnalyzed] = useState<RiseUpAnalyzedImportRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actions, setActions] = useState<Record<number, RiseUpImportAction>>({});
  const [proposals, setProposals] = useState<RiseUpImportProposal[]>([]);
  const [proposalActions, setProposalActions] = useState<Record<string, "approve" | "reject" | "skip">>({});
  const [proposalWorkExpense, setProposalWorkExpense] = useState<
    Record<string, RiseUpProposalWorkExpenseDraft>
  >({});
  const [activeSection, setActiveSection] = useState<RiseUpWizardSection>("instruments");
  const [analyzeSummary, setAnalyzeSummary] = useState<RiseUpAnalyzeSummary | null>(null);
  const [resetPreview, setResetPreview] = useState<RiseUpResetPreview | null>(null);
  const [previewingReset, setPreviewingReset] = useState(false);
  const [overrides, setOverrides] = useState<
    Record<
      number,
      {
        bank_account_id: string | null;
        credit_card_id: string | null;
        payee_id: string | null;
        new_payee_name: string;
        category_id: string | null;
        job_id: string | null;
        subscription_id: string | null;
        loan_id: string | null;
      }
    >
  >({});

  const initOverrides = (rows: RiseUpAnalyzedImportRow[]) => {
    const next: typeof overrides = {};
    const nextActions: Record<number, RiseUpImportAction> = {};
    for (const r of rows) {
      const bank =
        r.instrument.kind === "bank_account" ? r.instrument.selectedId : null;
      const card =
        r.instrument.kind === "credit_card" ? r.instrument.selectedId : null;
      next[r.rowIndex] = {
        bank_account_id: bank,
        credit_card_id: card,
        payee_id: r.payee.selectedId,
        new_payee_name: "",
        category_id: r.category.selectedId,
        job_id: r.job.selectedId,
        subscription_id: r.subscription.selectedId,
        loan_id: r.loan.selectedId,
      };
      nextActions[r.rowIndex] =
        r.importStatus === "new" && !r.isZeroAmountPending ? "create" : "skip";
    }
    setOverrides(next);
    setActions(nextActions);
  };

  async function analyze() {
    if (!file) {
      setError(isHe ? "נא לבחור קובץ CSV" : "Please choose a CSV file");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/import/riseup/analyze", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Analyze failed");
        setLoading(false);
        return;
      }
      const rows = data.rows as RiseUpAnalyzedImportRow[];
      setAnalyzed(rows);
      setProposals((data.proposals as RiseUpImportProposal[] | undefined) ?? []);
      setProposalActions({});
      setProposalWorkExpense({});
      setAnalyzeSummary((data.summary as RiseUpAnalyzeSummary | undefined) ?? null);
      setActiveSection("instruments");
      setFileName(data.fileName ?? file.name);
      initOverrides(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyze failed");
    }
    setLoading(false);
  }

  async function commit() {
    if (!analyzed || !fileName) return;
    setCommitting(true);
    setError(null);
    setSuccess(null);
    try {
      const rows = buildCommitPayload(analyzed, overrides, actions);
      const selectedProposals: RiseUpCommitProposalPayload[] = Object.entries(proposalActions)
        .filter(([, action]) => action !== "skip")
        .map(([id, action]) => {
          const draft = proposalWorkExpense[id];
          const proposal = proposals.find((p) => p.id === id);
          const payloadOverrides =
            proposal?.entity_kind === "subscription" && draft?.isWorkExpense
              ? {
                  familyMemberId: draft.familyMemberId || null,
                  jobId: draft.jobId || null,
                  isWorkExpense: true,
                }
              : undefined;
          return { id, action, payloadOverrides };
        });
      const res = await fetch("/api/import/riseup/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, rows, proposals: selectedProposals }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Commit failed");
        setCommitting(false);
        return;
      }
      setSuccess(
        isHe
          ? `נוצרו ${data.count ?? 0} תנועות, עודכנו ${data.updatedCount ?? 0}, דולגו ${data.skippedCount ?? 0}.`
          : `Created ${data.count ?? 0}, updated ${data.updatedCount ?? 0}, skipped ${data.skippedCount ?? 0}.`,
      );
      setAnalyzed(null);
      setFile(null);
      setFileName(null);
      setActions({});
      setProposals([]);
      setProposalActions({});
      setProposalWorkExpense({});
      setAnalyzeSummary(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commit failed");
    }
    setCommitting(false);
  }

  async function previewReset() {
    setPreviewingReset(true);
    setError(null);
    try {
      const res = await fetch("/api/import/riseup/reset-preview");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset preview failed");
        setPreviewingReset(false);
        return;
      }
      setResetPreview(data as RiseUpResetPreview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset preview failed");
    }
    setPreviewingReset(false);
  }

  const uncertainCount = useMemo(
    () => (analyzed ? analyzed.filter((r) => r.needsReview).length : 0),
    [analyzed],
  );

  const importSummary = useMemo(() => {
    if (!analyzed) return null;
    return {
      new: analyzed.filter((r) => r.importStatus === "new").length,
      existing: analyzed.filter((r) => r.importStatus === "existing").length,
      changed: analyzed.filter((r) => r.importStatus === "changed").length,
      ambiguous: analyzed.filter((r) => r.importStatus === "ambiguous").length,
      selectedCreates: analyzed.filter(
        (r) => (actions[r.rowIndex] ?? "skip") === "create",
      ).length,
      selectedUpdates: analyzed.filter(
        (r) => (actions[r.rowIndex] ?? "skip") === "update",
      ).length,
      selectedSkips: analyzed.filter(
        (r) => (actions[r.rowIndex] ?? "skip") === "skip",
      ).length,
    };
  }, [actions, analyzed]);

  const wizardSections: Array<{ id: RiseUpWizardSection; label: string }> = [
    { id: "instruments", label: isHe ? "אמצעי תשלום" : "Instruments" },
    { id: "core_mappings", label: isHe ? "התאמות בסיסיות" : "Core mappings" },
    { id: "domain_entities", label: isHe ? "ישויות" : "Domain entities" },
    { id: "transaction_actions", label: isHe ? "תנועות" : "Transactions" },
    { id: "historical_backfill", label: isHe ? "קישור היסטורי" : "Backfill" },
  ];

  const visibleProposals = proposals.filter((p) => {
    if (activeSection === "instruments") {
      return p.entity_kind === "bank_account" || p.entity_kind === "credit_card";
    }
    if (activeSection === "core_mappings") {
      return p.entity_kind === "payee" || p.entity_kind === "category";
    }
    if (activeSection === "domain_entities") {
      return !["bank_account", "credit_card", "payee", "category"].includes(p.entity_kind);
    }
    if (activeSection === "historical_backfill") {
      return p.proposal_kind === "link_transactions";
    }
    return false;
  });

  const visibleRows = useMemo(() => {
    if (!analyzed) return [];
    if (activeSection !== "transaction_actions") return [];
    return analyzed;
  }, [activeSection, analyzed]);

  function setO(
    rowIndex: number,
    patch: Partial<(typeof overrides)[number]>,
  ) {
    setOverrides((prev) => ({
      ...prev,
      [rowIndex]: { ...prev[rowIndex], ...patch },
    }));
  }

  function setAction(rowIndex: number, action: RiseUpImportAction) {
    setActions((prev) => ({ ...prev, [rowIndex]: action }));
  }

  function setProposalAction(id: string | undefined, action: "approve" | "reject" | "skip") {
    if (!id) return;
    setProposalActions((prev) => ({ ...prev, [id]: action }));
  }

  function setProposalWorkExpenseDraft(
    proposal: RiseUpImportProposal,
    patch: Partial<RiseUpProposalWorkExpenseDraft>,
  ) {
    if (!proposal.id) return;
    setProposalWorkExpense((prev) => ({
      ...prev,
      [proposal.id!]: {
        ...proposalWorkExpenseDraft(proposal, prev[proposal.id!]),
        ...patch,
      },
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-violet-800/60 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-slate-200">
            {isHe ? "ייבוא RiseUp (CSV)" : "RiseUp import (CSV)"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {isHe
              ? "ייצוא מ-RiseUp: נתח את הקובץ, בדוק התאמות, ואשר לפני שמירה."
              : "Export from RiseUp: analyze the file, review matches, then confirm to save."}
          </p>
          {success ? <p className="mt-2 text-sm text-emerald-300">{success}</p> : null}
        </div>
        <button
          type="button"
          disabled={previewingReset}
          onClick={() => void previewReset()}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          {previewingReset
            ? isHe
              ? "בודק…"
              : "Previewing…"
            : isHe
              ? "בדיקת השפעת איפוס"
              : "Check reset impact"}
        </button>
      </div>

      {resetPreview ? (
        <div
          className={`rounded-lg border p-3 text-xs ${
            resetPreview.blocked
              ? "border-amber-700 bg-amber-950/30 text-amber-100"
              : "border-slate-700 bg-slate-950/50 text-slate-300"
          }`}
        >
          <div className="font-medium">
            {isHe
              ? `בדיקת השפעת איפוס: ${resetPreview.totalRiseUpTransactions} תנועות RiseUp, ${resetPreview.enrichedTransactions} עם קישורים/סיווגים, ${resetPreview.genericLinkCount ?? 0} קישורי ישויות, ${resetPreview.proposalCount ?? 0} הצעות, ${resetPreview.downstreamLinkCount} קישורים חיצוניים.`
              : `Reset impact check: ${resetPreview.totalRiseUpTransactions} RiseUp transactions, ${resetPreview.enrichedTransactions} enriched/linked rows, ${resetPreview.genericLinkCount ?? 0} generic entity links, ${resetPreview.proposalCount ?? 0} staged proposals, ${resetPreview.downstreamLinkCount} downstream links.`}
          </div>
          <div className="mt-1">{resetPreview.message}</div>
          {resetPreview.downstreamLinkCount > 0 ? (
            <div className="mt-1 text-[10px]">
              {Object.entries(resetPreview.downstreamLinks)
                .filter(([, count]) => count > 0)
                .map(([name, count]) => `${name}: ${count}`)
                .join(" · ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {!analyzed ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              {isHe ? "קובץ CSV" : "CSV file"}
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-violet-500"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void analyze()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-60"
          >
            {loading ? (isHe ? "מנתח…" : "Analyzing…") : isHe ? "נתח קובץ" : "Analyze file"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
            <span>
              {fileName} — {analyzed.length}{" "}
              {isHe ? "שורות" : "rows"}
              {uncertainCount > 0 ? (
                <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-amber-200">
                  {uncertainCount} {isHe ? "דורשות בדיקה" : "need review"}
                </span>
              ) : (
                <span className="ml-2 text-emerald-400">
                  {isHe ? "התאמות בטוחות" : "Mostly high-confidence"}
                </span>
              )}
            </span>
            {importSummary ? (
              <span className="text-xs text-slate-400">
                {isHe
                  ? `חדשות ${importSummary.new}, קיימות ${importSummary.existing}, שונו ${importSummary.changed}, לא חד משמעיות ${importSummary.ambiguous}`
                  : `New ${importSummary.new}, existing ${importSummary.existing}, changed ${importSummary.changed}, ambiguous ${importSummary.ambiguous}`}
              </span>
            ) : null}
            <button
              type="button"
              className="text-xs text-slate-400 underline hover:text-slate-200"
              onClick={() => {
                setAnalyzed(null);
                setFile(null);
                setFileName(null);
                setActions({});
                setProposals([]);
                setProposalActions({});
                setAnalyzeSummary(null);
                setActiveSection("instruments");
                setSuccess(null);
              }}
            >
              {isHe ? "התחל מחדש" : "Start over"}
            </button>
          </div>

          {importSummary ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-300">
              {isHe
                ? `ברירת המחדל היא ייבוא אינקרמנטלי: ${importSummary.selectedCreates} תנועות חדשות ייווצרו, ${importSummary.selectedUpdates} שינויים מאושרים יעודכנו, ו-${importSummary.selectedSkips} שורות ידולגו. שורות קיימות ותנועות בסכום אפס מדולגות כברירת מחדל.`
                : `Default incremental import: ${importSummary.selectedCreates} new transactions will be created, ${importSummary.selectedUpdates} reviewed changes will be updated, and ${importSummary.selectedSkips} rows will be skipped. Existing and zero-amount rows are skipped by default.`}
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
            <div className="flex flex-wrap gap-2">
              {wizardSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    activeSection === section.id
                      ? "bg-violet-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
            {analyzeSummary ? (
              <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-5">
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-slate-500">{isHe ? "שורות לבדיקה" : "Needs review"}</div>
                  <div className="text-lg font-semibold">{analyzeSummary.needsReview}</div>
                </div>
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-slate-500">{isHe ? "הצעות" : "Proposals"}</div>
                  <div className="text-lg font-semibold">{analyzeSummary.proposals.total}</div>
                </div>
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-slate-500">{isHe ? "דפוסים" : "Patterns"}</div>
                  <div className="text-lg font-semibold">{analyzeSummary.patterns?.totalPatterns ?? 0}</div>
                </div>
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-slate-500">{isHe ? "ייבוא ישן זוהה" : "Legacy scanned"}</div>
                  <div className="text-lg font-semibold">{analyzeSummary.legacyScanned}</div>
                </div>
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-slate-500">{isHe ? "ייבוא ישן עודכן" : "Legacy backfilled"}</div>
                  <div className="text-lg font-semibold">{analyzeSummary.legacyBackfilled}</div>
                </div>
              </div>
            ) : null}
            {analyzeSummary?.patterns?.highlights?.length ? (
              <div className="mt-3 rounded border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-300">
                <div className="mb-1 font-medium text-slate-200">
                  {isHe ? "דפוסים חזקים שזוהו" : "Strong detected patterns"}
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {analyzeSummary.patterns.highlights.slice(0, 8).map((pattern) => (
                    <div key={pattern.key} className="rounded bg-slate-900 px-2 py-1">
                      <span className="font-medium text-slate-100">{pattern.title}</span>
                      <span className="text-slate-500">
                        {" "}
                        · {patternKindLabel(pattern.kind)} · {pattern.activeMonths} months · avg {pattern.averageAmount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {activeSection !== "transaction_actions" ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
              <div className="mb-2 text-sm font-medium text-slate-200">
                {activeSection === "historical_backfill"
                  ? isHe
                    ? "קישור היסטורי"
                    : "Historical backfill"
                  : isHe
                    ? "הצעות ישויות"
                    : "Entity proposals"}
              </div>
              {visibleProposals.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {isHe
                    ? "אין הצעות בשלב זה."
                    : "No staged proposals in this step."}
                </p>
              ) : (
                <div className="grid gap-2">
                  {visibleProposals.map((proposal) => {
                    const selected = proposal.id ? proposalActions[proposal.id] ?? "skip" : "skip";
                    const isSubscription = proposal.entity_kind === "subscription";
                    const workDraft = proposal.id
                      ? proposalWorkExpenseDraft(
                          proposal,
                          proposal.id ? proposalWorkExpense[proposal.id] : undefined,
                        )
                      : null;
                    const detailLines = subscriptionProposalDetailLines(proposal, isHe);
                    return (
                      <div
                        key={proposal.id ?? proposal.clientKey}
                        className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-100">{proposal.title}</div>
                            <div className="mt-1 text-slate-400">{proposal.summary}</div>
                            {detailLines.length > 0 ? (
                              <ul className="mt-2 list-inside list-disc text-slate-400">
                                {detailLines.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            ) : null}
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                              {proposal.entity_kind} · {proposal.confidence} · {proposal.supportRows.length} supporting rows
                            </div>
                            {isSubscription && proposal.id ? (
                              <div className="mt-3 rounded-lg border border-slate-600/80 bg-slate-950/50 p-3">
                                <label className="mb-2 flex items-center gap-2 text-slate-200">
                                  <input
                                    type="checkbox"
                                    checked={workDraft?.isWorkExpense ?? false}
                                    onChange={(e) =>
                                      setProposalWorkExpenseDraft(proposal, {
                                        isWorkExpense: e.target.checked,
                                        ...(e.target.checked
                                          ? {}
                                          : { familyMemberId: "", jobId: "" }),
                                      })
                                    }
                                    className="rounded border-slate-500"
                                  />
                                  <span className="font-medium">
                                    {isHe ? "הוצאה מקצועית (מנוי עבודה)" : "Work expense subscription"}
                                  </span>
                                </label>
                                {workDraft?.isWorkExpense ? (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <SubscriptionFamilyJobSelects
                                      members={familyMembers}
                                      jobs={jobs}
                                      familyMemberId={workDraft.familyMemberId}
                                      jobId={workDraft.jobId}
                                      onFamilyMemberIdChange={(familyMemberId) =>
                                        setProposalWorkExpenseDraft(proposal, { familyMemberId })
                                      }
                                      onJobIdChange={(jobId) =>
                                        setProposalWorkExpenseDraft(proposal, { jobId })
                                      }
                                      fieldIdPrefix={`proposal-${proposal.id}-`}
                                      memberLabel={isHe ? "בן/בת משפחה" : "Family member"}
                                      jobLabel={isHe ? "משרה" : "Job"}
                                      selectClassName={subscriptionSelectClass}
                                      noneLabel={isHe ? "ללא" : "None"}
                                    />
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500">
                                    {isHe
                                      ? "סמנו כדי לקשר את המנוי לאדם ולמשרה (למשל Claude, Cursor)."
                                      : "Check to link this subscription to a person and job (e.g. Claude, Cursor)."}
                                  </p>
                                )}
                                {workDraft?.isWorkExpense && selected === "approve" && !workDraft.jobId ? (
                                  <p className="mt-2 text-[11px] text-amber-300">
                                    {isHe
                                      ? "מומלץ לבחור משרה לפני אישור הוצאה מקצועית."
                                      : "Select a job before approving as a work expense."}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <select
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                            value={selected}
                            onChange={(e) =>
                              setProposalAction(
                                proposal.id,
                                e.target.value as "approve" | "reject" | "skip",
                              )
                            }
                          >
                            <option value="skip">{isHe ? "דלג כרגע" : "Skip for now"}</option>
                            <option value="approve">{isHe ? "אשר" : "Approve"}</option>
                            <option value="reject">{isHe ? "דחה" : "Reject"}</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {activeSection === "transaction_actions" ? (
          <div className="max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-slate-700">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-800 text-slate-300">
                <tr>
                  <th className="border-b border-slate-600 px-2 py-2">#</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "תאריך" : "Date"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "עסק" : "Merchant"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "סכום" : "Amount"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "ייבוא" : "Import"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "מכשיר" : "Instrument"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "משלם" : "Payee"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "קטגוריה" : "Category"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "משרה" : "Job"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "מנוי" : "Subscription"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "הלוואה?" : "Loan?"}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => {
                  const o = overrides[r.rowIndex];
                  if (!o) return null;
                  const action = actions[r.rowIndex] ?? "skip";
                  const statusLabel =
                    r.importStatus === "new"
                      ? isHe
                        ? "חדשה"
                        : "New"
                      : r.importStatus === "existing"
                        ? isHe
                          ? "קיימת"
                          : "Existing"
                        : r.importStatus === "changed"
                          ? isHe
                            ? "שונתה"
                            : "Changed"
                          : isHe
                            ? "לא חד משמעית"
                            : "Ambiguous";
                  const instLabel =
                    r.instrument.kind === "bank_account"
                      ? isHe
                        ? "חשבון"
                        : "Account"
                      : r.instrument.kind === "credit_card"
                        ? isHe
                          ? "כרטיס"
                          : "Card"
                        : "?";
                  return (
                    <tr
                      key={r.rowIndex}
                      className={
                        r.needsReview
                          ? "bg-amber-950/40"
                          : r.importStatus === "existing"
                            ? "bg-slate-950/60 opacity-70"
                            : r.importStatus === "changed"
                              ? "bg-sky-950/30"
                          : "bg-slate-900/40"
                      }
                    >
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top text-slate-500">
                        {r.rowIndex + 1}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top whitespace-nowrap text-slate-200">
                        {r.paymentDate}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top text-slate-200">
                        {r.businessName}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top font-mono text-slate-200">
                        {r.amount.toFixed(2)}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <div className="text-[10px] text-slate-400">{statusLabel}</div>
                        {r.importStatus === "changed" && r.changedFields.length > 0 ? (
                          <div className="mt-1 max-w-[220px] text-[10px] text-sky-200">
                            {r.changedFields.slice(0, 3).map((d) => (
                              <div key={d.field}>
                                {d.label}: {d.existing ?? "—"} → {d.incoming ?? "—"}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <select
                          className="mt-1 rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={action}
                          onChange={(e) =>
                            setAction(r.rowIndex, e.target.value as RiseUpImportAction)
                          }
                        >
                          {r.importStatus === "new" ? (
                            <>
                              <option value="create">{isHe ? "צור" : "Create"}</option>
                              <option value="skip">{isHe ? "דלג" : "Skip"}</option>
                            </>
                          ) : r.importStatus === "changed" ? (
                            <>
                              <option value="skip">{isHe ? "דלג" : "Skip"}</option>
                              <option value="update">{isHe ? "עדכן" : "Update"}</option>
                            </>
                          ) : (
                            <option value="skip">{isHe ? "דלג" : "Skip"}</option>
                          )}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <div className="text-[10px] text-slate-500">{instLabel}</div>
                        <select
                          className="mt-0.5 max-w-[220px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={instrumentValue(o)}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) {
                              setO(r.rowIndex, { bank_account_id: null, credit_card_id: null });
                              return;
                            }
                            if (v.startsWith("bank:")) {
                              setO(r.rowIndex, {
                                bank_account_id: v.slice(5),
                                credit_card_id: null,
                              });
                            } else if (v.startsWith("card:")) {
                              setO(r.rowIndex, {
                                credit_card_id: v.slice(5),
                                bank_account_id: null,
                              });
                            }
                          }}
                        >
                          <option value="">—</option>
                          {r.instrument.kind === "unknown" ? (
                            <>
                              <optgroup label={isHe ? "חשבונות בנק" : "Bank accounts"}>
                                {bankAccounts.map((b) => (
                                  <option key={`b-${b.id}`} value={`bank:${b.id}`}>
                                    {b.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label={isHe ? "כרטיסי אשראי" : "Credit cards"}>
                                {creditCards.map((c) => (
                                  <option key={`c-${c.id}`} value={`card:${c.id}`}>
                                    {c.label}
                                  </option>
                                ))}
                              </optgroup>
                            </>
                          ) : r.instrument.kind === "bank_account" ? (
                            (r.instrument.candidates.length
                              ? r.instrument.candidates
                              : bankAccounts.map((b) => ({
                                  id: b.id,
                                  label: b.label,
                                  score: 0,
                                  confidence: "low" as const,
                                }))
                            ).map((c) => (
                              <option key={c.id} value={`bank:${c.id}`}>
                                {c.label} ({c.confidence})
                              </option>
                            ))
                          ) : (
                            (r.instrument.candidates.length
                              ? r.instrument.candidates
                              : creditCards.map((b) => ({
                                  id: b.id,
                                  label: b.label,
                                  score: 0,
                                  confidence: "low" as const,
                                }))
                            ).map((c) => (
                              <option key={c.id} value={`card:${c.id}`}>
                                {c.label} ({c.confidence})
                              </option>
                            ))
                          )}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.payee_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, {
                              payee_id: e.target.value || null,
                              new_payee_name: "",
                            })
                          }
                        >
                          <option value="">{isHe ? "(חדש)" : "(new)"}</option>
                          {r.payee.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        {!o.payee_id ? (
                          <input
                            className="mt-1 w-full max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                            placeholder={isHe ? "שם משלם חדש" : "New payee name"}
                            value={o.new_payee_name}
                            onChange={(e) =>
                              setO(r.rowIndex, { new_payee_name: e.target.value })
                            }
                          />
                        ) : null}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[160px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.category_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { category_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.category.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.job_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { job_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.job.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.subscription_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { subscription_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.subscription.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[160px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.loan_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { loan_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.loan.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          ) : null}

          <button
            type="button"
            disabled={committing}
            onClick={() => void commit()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {committing
              ? isHe
                ? "שומר…"
                : "Saving…"
              : isHe
                ? "אשר ושמור תנועות"
                : "Confirm and save transactions"}
          </button>
        </>
      )}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
