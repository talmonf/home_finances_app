/**
 * Household-scoped RiseUp row matching: scores + confidence tiers (plan appendix A).
 */

import { prisma } from "@/lib/auth";
import type { RiseUpParsedRow } from "@/lib/riseup-import";

export type ConfidenceTier = "high" | "medium" | "low";

export type EntityCandidate = {
  id: string;
  label: string;
  score: number;
  confidence: ConfidenceTier;
  reason?: string;
};

export type FieldMatch = {
  candidates: EntityCandidate[];
  /** Best automatic pick when confidence is high and unambiguous */
  selectedId: string | null;
  selectedConfidence: ConfidenceTier | null;
};

export type RiseUpAnalyzedRow = RiseUpParsedRow & {
  transactionDirection: "debit" | "credit";
  instrument: FieldMatch & { kind: "bank_account" | "credit_card" | "unknown" };
  payee: FieldMatch;
  category: FieldMatch;
  job: FieldMatch;
  subscription: FieldMatch;
  loan: FieldMatch;
  utility: FieldMatch;
  insurance: FieldMatch;
  donation: FieldMatch;
  digitalMethod: FieldMatch;
  /** Heuristic: utility-like from RiseUp category (ארנונה, חשמל, …). */
  utilityCategoryHint:
    | "electricity"
    | "water"
    | "internet"
    | "telephone"
    | "gas"
    | "other"
    | "arnona"
    | null;
  needsReview: boolean;
  reviewReasons: string[];
};

function tierFromScore(score: number): ConfidenceTier {
  if (score >= 85) return "high";
  if (score >= 55) return "medium";
  return "low";
}

export function normalizeComparableName(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"`׳״]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function extractLastFour(s: string): string | null {
  const d = digitsOnly(s);
  if (d.length >= 4) return d.slice(-4);
  return null;
}

function tokenOverlapScore(a: string, b: string): number {
  const na = normalizeComparableName(a);
  const nb = normalizeComparableName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 88;
  const ta = new Set(na.split(" ").filter((x) => x.length > 1));
  const tb = new Set(nb.split(" ").filter((x) => x.length > 1));
  let inter = 0;
  for (const x of ta) {
    if (tb.has(x)) inter++;
  }
  const union = ta.size + tb.size - inter;
  return union > 0 ? Math.round((100 * (2 * inter)) / (ta.size + tb.size)) : 0;
}

function amountClose(a: number, b: number, tolRatio = 0.08): boolean {
  const da = Math.abs(a);
  const db = Math.abs(b);
  const m = Math.max(1, da, db);
  return Math.abs(da - db) / m <= tolRatio;
}

function parseDecimal(n: unknown): number {
  if (n === null || n === undefined) return NaN;
  if (typeof n === "number") return n;
  if (typeof n === "object" && n !== null && "toNumber" in n && typeof (n as { toNumber: () => number }).toNumber === "function") {
    return (n as { toNumber: () => number }).toNumber();
  }
  return parseFloat(String(n));
}

function pickBest(
  candidates: EntityCandidate[],
): { selectedId: string | null; selectedConfidence: ConfidenceTier | null } {
  if (candidates.length === 0) return { selectedId: null, selectedConfidence: null };
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];
  if (top.confidence === "high" && (!second || top.score - second.score >= 8)) {
    return { selectedId: top.id, selectedConfidence: top.confidence };
  }
  if (top.confidence === "medium" && (!second || top.score - second.score >= 15)) {
    return { selectedId: top.id, selectedConfidence: top.confidence };
  }
  return { selectedId: null, selectedConfidence: null };
}

function utilityHintFromCategory(cat: string): RiseUpAnalyzedRow["utilityCategoryHint"] {
  const c = cat.trim();
  if (!c) return null;
  if (c.includes("ארנונה") || c.includes("עיריית")) return "arnona";
  if (c.includes("חשמל")) return "electricity";
  if (c.includes("מים")) return "water";
  if (c.includes("גז")) return "gas";
  if (c.includes("תקשורת") || c.includes("אינטרנט")) return "internet";
  if (c.includes("טלפון") || c.includes("סלולר")) return "telephone";
  return null;
}

function issuerHintFromPaymentMethod(raw: string): string {
  return normalizeComparableName(raw);
}

export async function matchRiseUpRowsForHousehold(
  householdId: string,
  rows: RiseUpParsedRow[],
): Promise<RiseUpAnalyzedRow[]> {
  const [
    bankAccounts,
    creditCards,
    payees,
    categories,
    jobs,
    subscriptions,
    loans,
    propertyUtilities,
    insurancePolicies,
    donations,
    digitalMethods,
  ] = await Promise.all([
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
    }),
    prisma.credit_cards.findMany({
      where: { household_id: householdId, is_active: true },
    }),
    prisma.payees.findMany({ where: { household_id: householdId } }),
    prisma.categories.findMany({ where: { household_id: householdId, is_active: true } }),
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
    }),
    prisma.subscriptions.findMany({
      where: { household_id: householdId, is_active: true },
    }),
    prisma.loans.findMany({
      where: { household_id: householdId, is_active: true },
    }),
    prisma.property_utilities.findMany({
      where: { household_id: householdId },
      include: { property: true },
    }),
    prisma.insurance_policies.findMany({
      where: { household_id: householdId, is_active: true },
    }),
    prisma.donations.findMany({
      where: { household_id: householdId, is_active: true },
    }),
    prisma.digital_payment_methods.findMany({
      where: { household_id: householdId, is_active: true },
    }),
  ]);

  const out: RiseUpAnalyzedRow[] = [];

  for (const row of rows) {
    const amount = row.amount;
    const transactionDirection: "debit" | "credit" =
      amount < 0 ? "debit" : amount > 0 ? "credit" : "debit";

    const utilityCategoryHint = utilityHintFromCategory(row.cashflowCategory);

    // —— Instrument (G1)
    const instrumentKind: "bank_account" | "credit_card" | "unknown" =
      row.sourceKind === "creditCard"
        ? "credit_card"
        : row.sourceKind === "checkingAccount"
          ? "bank_account"
          : "unknown";

    const instrumentCandidates: EntityCandidate[] = [];
    const idNorm = normalizeComparableName(row.paymentIdentifierRaw).replace(/\s/g, "");
    const idDigits = digitsOnly(row.paymentIdentifierRaw);

    if (instrumentKind === "bank_account") {
      for (const b of bankAccounts) {
        const acc = (b.account_number ?? "").replace(/\s/g, "");
        let score = 0;
        if (acc && idDigits && digitsOnly(acc) === idDigits) score = 100;
        else if (acc && idNorm && acc.replace(/\s/g, "").includes(idDigits.slice(-6))) score = 82;
        else if (tokenOverlapScore(b.bank_name + " " + b.account_name, row.paymentMethodRaw) >= 70) score = 55;
        if (score > 0) {
          instrumentCandidates.push({
            id: b.id,
            label: `${b.bank_name} · ${b.account_name}${b.account_number ? ` (${b.account_number})` : ""}`,
            score,
            confidence: tierFromScore(score),
            reason: "account_number",
          });
        }
      }
    } else if (instrumentKind === "credit_card") {
      const last4 = extractLastFour(row.paymentIdentifierRaw);
      const pm = issuerHintFromPaymentMethod(row.paymentMethodRaw);
      for (const c of creditCards) {
        let score = 0;
        if (last4 && c.card_last_four === last4) {
          score = 95;
          const iss = normalizeComparableName(c.issuer_name);
          if (pm && (iss.includes(pm.slice(0, 4)) || pm.includes(iss.slice(0, 4)))) score = 100;
        } else if (tokenOverlapScore(c.card_name + " " + c.issuer_name, row.paymentMethodRaw + " " + row.paymentIdentifierRaw) >= 75) {
          score = 58;
        }
        if (score > 0) {
          instrumentCandidates.push({
            id: c.id,
            label: `${c.issuer_name} · ${c.card_name} · ${c.card_last_four}`,
            score,
            confidence: tierFromScore(score),
            reason: "card_last_four",
          });
        }
      }
    }

    instrumentCandidates.sort((a, b) => b.score - a.score);
    const instPick = pickBest(instrumentCandidates);
    const instrument: RiseUpAnalyzedRow["instrument"] = {
      kind: instrumentKind,
      candidates: instrumentCandidates.slice(0, 8),
      selectedId: instPick.selectedId,
      selectedConfidence: instPick.selectedConfidence,
    };

    const selectedCardId =
      instrumentKind === "credit_card" ? instPick.selectedId : null;

    // —— Payee (G2)
    const payeeCandidates: EntityCandidate[] = [];
    for (const p of payees) {
      const s = Math.max(
        tokenOverlapScore(row.businessName, p.name),
        p.normalized_name ? tokenOverlapScore(row.businessName, p.normalized_name) : 0,
      );
      if (s >= 45) {
        payeeCandidates.push({
          id: p.id,
          label: p.name,
          score: s,
          confidence: tierFromScore(s),
        });
      }
    }
    payeeCandidates.sort((a, b) => b.score - a.score);
    const payeePick = pickBest(payeeCandidates);

    // —— Category (G3)
    const categoryCandidates: EntityCandidate[] = [];
    for (const c of categories) {
      const s = tokenOverlapScore(row.cashflowCategory, c.name);
      if (s >= 50) {
        categoryCandidates.push({
          id: c.id,
          label: c.name,
          score: s,
          confidence: tierFromScore(s),
        });
      }
    }
    categoryCandidates.sort((a, b) => b.score - a.score);
    const categoryPick = pickBest(categoryCandidates);

    // —— Jobs (A.3) — income / salary-like
    const jobCandidates: EntityCandidate[] = [];
    const incomeLike =
      /הכנסות|משכורת|שכר/i.test(row.cashflowCategory) || transactionDirection === "credit";
    if (incomeLike) {
      for (const j of jobs) {
        if (j.is_private_clinic) continue;
        const en = (j.employer_name ?? "").trim();
        if (!en) continue;
        const s = tokenOverlapScore(row.businessName, en);
        if (s >= 50) {
          let score = s;
          if (
            j.bank_account_id &&
            instrumentKind === "bank_account" &&
            j.bank_account_id === instPick.selectedId
          ) {
            score = Math.min(100, score + 12);
          }
          if (
            j.credit_card_id &&
            instrumentKind === "credit_card" &&
            j.credit_card_id === instPick.selectedId
          ) {
            score = Math.min(100, score + 12);
          }
          jobCandidates.push({
            id: j.id,
            label: `${en} — ${j.job_title}`,
            score,
            confidence: tierFromScore(score),
          });
        }
      }
    }
    jobCandidates.sort((a, b) => b.score - a.score);
    const jobPick = pickBest(jobCandidates);

    // —— Subscriptions (A.4)
    const subscriptionCandidates: EntityCandidate[] = [];
    const subAmount = row.originalAmount ?? Math.abs(row.amount);
    for (const sub of subscriptions) {
      const fee = parseDecimal(sub.fee_amount);
      let score = tokenOverlapScore(row.businessName, sub.name);
      if (subAmount > 0 && !Number.isNaN(fee) && amountClose(subAmount, fee, 0.12)) {
        score = Math.min(100, score + 25);
      }
      if (
        selectedCardId &&
        sub.credit_card_id &&
        sub.credit_card_id === selectedCardId
      ) {
        score = Math.min(100, score + 15);
      }
      if (score >= 52) {
        subscriptionCandidates.push({
          id: sub.id,
          label: sub.name,
          score,
          confidence: tierFromScore(score),
        });
      }
    }
    subscriptionCandidates.sort((a, b) => b.score - a.score);
    const subPick = pickBest(subscriptionCandidates);

    // —— Loans (A.7) — debits only
    const loanCandidates: EntityCandidate[] = [];
    if (transactionDirection === "debit" && Math.abs(amount) > 0) {
      const payDay = row.paymentDate ? new Date(row.paymentDate + "T12:00:00Z").getUTCDate() : null;
      for (const loan of loans) {
        const expected = parseDecimal(loan.monthly_repayment_amount);
        let score = tokenOverlapScore(row.businessName, loan.institution_name);
        if (!Number.isNaN(expected) && expected > 0 && amountClose(Math.abs(amount), expected, 0.06)) {
          score = Math.min(100, Math.max(score, 72));
        }
        if (
          loan.repayment_day_of_month &&
          payDay &&
          loan.repayment_day_of_month === payDay
        ) {
          score = Math.min(100, score + 10);
        }
        if (score >= 48) {
          loanCandidates.push({
            id: loan.id,
            label: `${loan.institution_name}${loan.monthly_repayment_amount ? ` · ${loan.monthly_repayment_amount}` : ""}`,
            score,
            confidence: tierFromScore(score),
            reason: "amount_or_institution",
          });
        }
      }
    }
    loanCandidates.sort((a, b) => b.score - a.score);
    const loanPick = pickBest(loanCandidates);

    // —— Property utilities (A.9)
    const utilityCandidates: EntityCandidate[] = [];
    if (utilityCategoryHint) {
      for (const u of propertyUtilities) {
        if (utilityCategoryHint !== "arnona" && u.utility_type !== utilityCategoryHint) {
          if (!(utilityCategoryHint === "internet" && u.utility_type === "telephone")) continue;
        }
        const s = tokenOverlapScore(row.businessName, u.provider_name);
        if (s >= 48 || utilityCategoryHint === "arnona") {
          utilityCandidates.push({
            id: u.id,
            label: `${u.property.name} · ${u.provider_name} (${u.utility_type})`,
            score: Math.max(s, 60),
            confidence: tierFromScore(Math.max(s, 60)),
          });
        }
      }
    }
    utilityCandidates.sort((a, b) => b.score - a.score);
    const utilityPick = pickBest(utilityCandidates);

    // —— Insurance (A.6)
    const insuranceCandidates: EntityCandidate[] = [];
    for (const pol of insurancePolicies) {
      const s = Math.max(
        tokenOverlapScore(row.businessName, pol.provider_name),
        pol.insurance_company ? tokenOverlapScore(row.businessName, pol.insurance_company) : 0,
      );
      const prem = parseDecimal(pol.premium_paid);
      if (s >= 42) {
        let score = s;
        if (Math.abs(amount) > 0 && !Number.isNaN(prem) && amountClose(Math.abs(amount), prem, 0.12)) {
          score = Math.min(100, score + 18);
        }
        insuranceCandidates.push({
          id: pol.id,
          label: `${pol.policy_name} — ${pol.provider_name}`,
          score,
          confidence: tierFromScore(score),
        });
      }
    }
    insuranceCandidates.sort((a, b) => b.score - a.score);
    const insurancePick = pickBest(insuranceCandidates);

    // —— Donations (A.8)
    const donationCandidates: EntityCandidate[] = [];
    const donationCat = /תרומה/i.test(row.cashflowCategory);
    for (const d of donations) {
      const s = tokenOverlapScore(row.businessName, d.organization_name);
      if (s >= 48 || donationCat) {
        let score = Math.max(s, donationCat ? 55 : s);
        const ma = parseDecimal(d.monthly_amount);
        const oa = parseDecimal(d.one_time_amount);
        if (Math.abs(amount) > 0) {
          if (!Number.isNaN(ma) && ma > 0 && amountClose(Math.abs(amount), ma, 0.1)) score += 12;
          if (!Number.isNaN(oa) && oa > 0 && amountClose(Math.abs(amount), oa, 0.1)) score += 12;
        }
        if (score >= 50) {
          donationCandidates.push({
            id: d.id,
            label: d.organization_name,
            score: Math.min(100, score),
            confidence: tierFromScore(Math.min(100, score)),
          });
        }
      }
    }
    donationCandidates.sort((a, b) => b.score - a.score);
    const donationPick = pickBest(donationCandidates);

    // —— Digital methods (A.10)
    const digitalCandidates: EntityCandidate[] = [];
    const dmText = `${row.paymentMethodRaw} ${row.businessName}`;
    for (const dm of digitalMethods) {
      const hints = ["bit", "ביט", "paybox", "פייבוקס", "paypal", "פייפל"];
      const lowerDm = dmText.toLowerCase();
      const label = dm.name.toLowerCase();
      const hit = hints.some((h) => lowerDm.includes(h) && label.includes(h));
      const s = tokenOverlapScore(row.businessName, dm.name);
      if (hit || s >= 55) {
        digitalCandidates.push({
          id: dm.id,
          label: `${dm.name} (${dm.method_type})`,
          score: hit ? 90 : s,
          confidence: tierFromScore(hit ? 90 : s),
        });
      }
    }
    digitalCandidates.sort((a, b) => b.score - a.score);
    const digitalPick = pickBest(digitalCandidates);

    const reviewReasons: string[] = [];
    if (row.isZeroAmountPending) reviewReasons.push("zero_or_unparsed_amount");
    if (instrumentKind === "unknown") reviewReasons.push("unknown_source_kind");
    if (!instPick.selectedId && instrumentCandidates.length !== 1) {
      reviewReasons.push("instrument_uncertain");
    }
    if (!payeePick.selectedId && payeeCandidates.length > 1) reviewReasons.push("payee_ambiguous");
    if (instrumentCandidates.length > 1 && instrumentCandidates[0].score - instrumentCandidates[1].score < 6) {
      reviewReasons.push("instrument_tie");
    }

    const needsReview =
      reviewReasons.length > 0 ||
      !!row.isZeroAmountPending ||
      (instPick.selectedConfidence !== null && instPick.selectedConfidence === "low");

    out.push({
      ...row,
      transactionDirection,
      instrument: {
        ...instrument,
        ...instPick,
        candidates: instrument.candidates,
      },
      payee: { candidates: payeeCandidates.slice(0, 8), ...payeePick },
      category: { candidates: categoryCandidates.slice(0, 8), ...categoryPick },
      job: { candidates: jobCandidates.slice(0, 8), ...jobPick },
      subscription: { candidates: subscriptionCandidates.slice(0, 8), ...subPick },
      loan: { candidates: loanCandidates.slice(0, 8), ...loanPick },
      utility: { candidates: utilityCandidates.slice(0, 8), ...utilityPick },
      insurance: { candidates: insuranceCandidates.slice(0, 8), ...insurancePick },
      donation: { candidates: donationCandidates.slice(0, 8), ...donationPick },
      digitalMethod: { candidates: digitalCandidates.slice(0, 8), ...digitalPick },
      utilityCategoryHint,
      needsReview,
      reviewReasons,
    });
  }

  return out;
}
