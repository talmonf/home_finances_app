import { prisma } from "@/lib/auth";
import type { PrismaClient } from "@/generated/prisma/client";
import * as XLSX from "xlsx";

export type TipulimImportProfile = "tipulim_private" | "tipulim_org_monthly";

const TIPULIM_PRIVATE_HEADERS = [
  "קבלה",
  "תאריך תשלום",
  "שולם",
  "סכום",
  "מטופל",
  "תאריך",
  "סוג ביקור",
  "הערות",
  "דרך תשלום",
] as const;

const TIPULIM_ORG_MONTHLY_HEADERS = [
  "תכנית",
  "סוג ביקור",
  "מטופל",
  "סכום",
  "תאריך",
  "קבלה",
  "תאריך תשלום",
  "דרך תשלום",
  "הערות",
] as const;

/** UTF-8 CSV with BOM: header row only, matching the parser column names. */
export function tipulimImportExampleCsv(profile: TipulimImportProfile): string {
  const headers =
    profile === "tipulim_org_monthly" ? TIPULIM_ORG_MONTHLY_HEADERS : TIPULIM_PRIVATE_HEADERS;
  return `\uFEFF${headers.join(",")}\n`;
}

type ImportProfile = TipulimImportProfile;

type Row = Record<string, unknown>;

type ClientCandidate = {
  id: string;
  first_name: string;
  last_name: string | null;
};

type ClientRef =
  | { kind: "existing"; id: string; displayName: string }
  | { kind: "new"; tempKey: string; displayName: string; firstName: string; lastName: string | null };

type PendingTreatment = {
  key: string;
  clientRef: ClientRef;
  programName: string | null;
  occurredAt: Date;
  amount: string;
  visitType: "clinic" | "home" | "phone" | "video";
  note: string | null;
  paymentDate: Date | null;
  paymentMethod: "bank_transfer" | "digital_payment" | null;
  paymentBankAccountId: string | null;
  paymentDigitalMethodId: string | null;
};

type PendingAllocation = {
  amount: string;
  treatmentKey: string;
};

type PendingTravel = {
  occurredAt: Date | null;
  amount: string | null;
  note: string | null;
  treatmentKey: string | null;
};

type PendingConsultation = {
  occurredAt: Date;
  amount: string;
  note: string | null;
  typeName: string;
};

type PendingReceipt = {
  key: string;
  rowNumber: number;
  receiptNumber: string;
  issuedAt: Date;
  totalAmount: string;
  notes: string | null;
  paymentMethod: "cash" | "bank_transfer" | "digital_card" | "credit_card";
  recipientType: "client" | "organization";
  coveredPeriodStart?: Date | null;
  coveredPeriodEnd?: Date | null;
  allocations: PendingAllocation[];
  treatmentKeysToMarkPaid?: string[];
  treatmentPaymentMethod?: "bank_transfer" | "digital_payment" | null;
  treatmentBankAccountId?: string | null;
  treatmentDigitalMethodId?: string | null;
};

export type ImportConflict = {
  key: string;
  rowNumber: number;
  rawName: string;
  candidates: Array<{ id: string; label: string }>;
};

export type ProgramsToAutoCreate = {
  name: string;
  source: "system_default" | "sheet";
  treatmentCount: number;
  reason?: string;
};

export type TipulimAnalyzeResult = {
  newClientsCount: number;
  treatmentsTotal: number;
  treatmentsPerClient: Array<{ displayName: string; clientId: string | null; count: number }>;
  receiptsToCreateCount: number;
  programsToAutoCreate: ProgramsToAutoCreate[];
  warnings: string[];
  blockingErrors: string[];
  clientConflicts: ImportConflict[];
  routing?: {
    travelEntriesCount: number;
    consultationEntriesCount: number;
  };
};

export type TipulimCommitResult = TipulimAnalyzeResult & {
  created: {
    clients: number;
    treatments: number;
    receipts: number;
    allocations: number;
    travel: number;
    consultations: number;
    programs: number;
  };
};

export type TipulimAnalyzeParams = {
  householdId: string;
  jobId: string;
  selectedProgramId?: string | null;
  profile: ImportProfile;
  workbook: XLSX.WorkBook;
  sheetName?: string | null;
  missingVisitType?: "clinic" | "home" | "phone" | "video" | null;
  clientResolutions?: Record<string, string>;
};

function sheetRows(workbook: XLSX.WorkBook, sheetName?: string | null): Row[] {
  const chosen = sheetName && workbook.Sheets[sheetName] ? sheetName : workbook.SheetNames[0];
  if (!chosen) return [];
  const ws = workbook.Sheets[chosen];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
  return rows.filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));
}

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function norm(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

function normalizeDigits(v: string): string {
  return v.replace(/[^\d]/g, "");
}

function receiptMatchKey(raw: unknown): string {
  const text = String(raw ?? "")
    .replace(/\u00A0/g, " ")
    .trim();
  if (!text) return "";
  const digitsLike = text.match(/^0*(\d+)(?:\.0+)?$/);
  if (digitsLike?.[1]) {
    const normalized = digitsLike[1].replace(/^0+/, "");
    return normalized || "0";
  }
  return norm(text).toLowerCase();
}

function parseMoney(raw: string): string | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

/** Excel 1900 date system (SheetJS / Excel): whole days since 1899-12-30 → UTC midnight for that calendar day. */
function excelSerialToUtcDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  const whole = Math.floor(serial);
  if (whole < 1 || whole > 1000000) return null;
  const ms = (whole - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1980 || y > 2100) return null;
  return d;
}

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d;
  const m = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})$/);
  if (m) {
    const day = parseInt(m[1]!, 10);
    const month = parseInt(m[2]!, 10) - 1;
    let year = parseInt(m[3]!, 10);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const dt = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  // CSV sometimes stores Excel serials as plain digits (e.g. "45321").
  if (/^\d{5,7}(\.\d+)?$/.test(trimmed.replace(/,/g, ""))) {
    const n = Number(trimmed.replace(/,/g, ""));
    if (Number.isFinite(n)) {
      const fromExcel = excelSerialToUtcDate(Math.floor(n));
      if (fromExcel) return fromExcel;
    }
  }
  return null;
}

/** Use for date columns: Excel serial numbers, Date cells, and locale date strings. */
function parseDateFromCell(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const whole = Math.floor(v);
    if (whole >= 20000 && whole < 1000000) {
      return excelSerialToUtcDate(whole);
    }
    return null;
  }
  return parseDate(String(v));
}

function parseCoveredMonth(raw: string): { start: Date; end: Date } | null {
  const t = raw.trim();
  if (!t) return null;
  const withDay = new Date(`1 ${t}`);
  if (Number.isNaN(withDay.getTime())) return null;
  const start = new Date(Date.UTC(withDay.getUTCFullYear(), withDay.getUTCMonth(), 1));
  const end = new Date(Date.UTC(withDay.getUTCFullYear(), withDay.getUTCMonth() + 1, 0));
  return { start, end };
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function parseClientName(raw: string): { firstName: string; lastInitial: string | null } {
  const text = norm(raw);
  const m = text.match(/^(.+?)\s+([^\s.])\.?$/);
  if (!m) return { firstName: text, lastInitial: null };
  return { firstName: norm(m[1]), lastInitial: m[2] ?? null };
}

function visitTypeFromCell(raw: string): "clinic" | "home" | "phone" | "video" | null {
  const t = norm(raw).toLowerCase();
  if (!t) return null;
  if (["clinic", "קליניקה"].includes(t)) return "clinic";
  if (["home", "בית", "ביקור בית"].includes(t)) return "home";
  if (["phone", "טלפון", "ייעוץ טלפוני"].includes(t)) return "phone";
  if (["video", "וידאו", "מקוון (וידאו)", "מקוון"].includes(t)) return "video";
  return null;
}

function consultationTypeKey(raw: string): string {
  const lowered = norm(raw).toLowerCase();
  const map: Record<string, string> = {
    בונוס: "bonus",
    "חבר מביא חבר": "referral_bonus",
    התייעצות: "consultation",
    "ישיבת צוות": "team_meeting",
    הדרכה: "supervision",
    פגישה: "meeting",
    אירוע: "event",
  };
  if (map[lowered]) return map[lowered];
  return lowered
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "") || "other";
}

function paymentMethodFromText(raw: string): {
  receiptMethod: "cash" | "bank_transfer" | "digital_card" | "credit_card" | null;
  treatmentMethod: "bank_transfer" | "digital_payment" | null;
  accountDigits: string | null;
  digitalHint: string | null;
} {
  const text = norm(raw);
  if (!text) return { receiptMethod: null, treatmentMethod: null, accountDigits: null, digitalHint: null };
  if (text.includes("העברה")) {
    const digitRuns = text.match(/\d+/g) ?? [];
    const longest = digitRuns.sort((a, b) => b.length - a.length)[0] ?? null;
    return {
      receiptMethod: "bank_transfer",
      treatmentMethod: "bank_transfer",
      accountDigits: longest,
      digitalHint: null,
    };
  }
  if (text.includes("ביט") || text.toLowerCase().includes("bit")) {
    return {
      receiptMethod: "digital_card",
      treatmentMethod: "digital_payment",
      accountDigits: null,
      digitalHint: "ביט",
    };
  }
  return { receiptMethod: null, treatmentMethod: null, accountDigits: null, digitalHint: null };
}

type BankDigitalImportCtx = {
  isPrivateClinic: boolean;
  bankAccounts: Array<{ id: string; account_number: string | null }>;
  digitalMethods: Array<{ id: string; name: string }>;
};

/** Resolves bank / digital payment method IDs for import rows (receipt anchors and direct treatment payment). */
function resolveBankDigitalForParsedPayment(
  ctx: BankDigitalImportCtx,
  payment: ReturnType<typeof paymentMethodFromText>,
  rowNumber: number,
  scratch: { errors: string[]; warnings: string[] },
  paymentRouteLabel: string,
): { ok: boolean; bankId: string | null; digitalId: string | null } {
  let bankId: string | null = null;
  let digitalId: string | null = null;
  if (!payment.treatmentMethod) return { ok: true, bankId, digitalId };

  if (payment.treatmentMethod === "bank_transfer") {
    if (payment.accountDigits) {
      const digits = normalizeDigits(payment.accountDigits);
      const matches = ctx.bankAccounts.filter((b) => {
        const v = normalizeDigits(b.account_number ?? "");
        return v.includes(digits) || digits.includes(v);
      });
      if (matches.length === 1) bankId = matches[0]!.id;
      else if (matches.length > 1) {
        scratch.errors.push(`Row ${rowNumber}: multiple bank accounts match ${payment.accountDigits}.`);
        return { ok: false, bankId, digitalId };
      } else if (ctx.isPrivateClinic) {
        scratch.warnings.push(`Row ${rowNumber}: bank transfer account ${payment.accountDigits} not matched.`);
      } else {
        scratch.errors.push(`Row ${rowNumber}: bank transfer account ${payment.accountDigits} not matched.`);
        return { ok: false, bankId, digitalId };
      }
    } else if (ctx.isPrivateClinic) {
      scratch.warnings.push(`Row ${rowNumber}: bank transfer has no account digits.`);
    } else {
      scratch.errors.push(`Row ${rowNumber}: bank transfer must include account digits.`);
      return { ok: false, bankId, digitalId };
    }
  }
  if (payment.treatmentMethod === "digital_payment") {
    const hint = payment.digitalHint?.toLowerCase() ?? "";
    const matches = ctx.digitalMethods.filter((m) => m.name.toLowerCase().includes(hint));
    if (matches.length === 1) digitalId = matches[0]!.id;
    else {
      scratch.errors.push(
        `Row ${rowNumber}: could not uniquely match digital payment method ${paymentRouteLabel || "(digital)"}.`,
      );
      return { ok: false, bankId, digitalId };
    }
  }
  return { ok: true, bankId, digitalId };
}

type AnalyzeScratch = {
  rows: Row[];
  warnings: string[];
  errors: string[];
  conflicts: ImportConflict[];
  treatmentCountsByDisplay: Map<string, number>;
  pendingTreatments: Map<string, PendingTreatment>;
  pendingReceipts: PendingReceipt[];
  newClients: Map<string, { displayName: string; firstName: string; lastName: string | null }>;
  autoPrograms: Map<string, ProgramsToAutoCreate>;
  routing: { travel: number; consultations: number };
  pendingTravel: PendingTravel[];
  pendingConsultations: PendingConsultation[];
};

async function resolveClientRef(
  rawClient: string,
  rowNumber: number,
  clients: ClientCandidate[],
  newClients: AnalyzeScratch["newClients"],
  conflicts: AnalyzeScratch["conflicts"],
  clientResolutions: Record<string, string> | undefined,
): Promise<ClientRef | null> {
  const displayName = norm(rawClient);
  if (!displayName) return null;
  const parsed = parseClientName(displayName);
  const sameFirst = clients.filter((c) => norm(c.first_name) === parsed.firstName);
  let matched = sameFirst;
  if (parsed.lastInitial) {
    matched = sameFirst.filter((c) => (c.last_name ?? "").trim().startsWith(parsed.lastInitial!));
  }
  if (matched.length === 1) {
    return { kind: "existing", id: matched[0]!.id, displayName };
  }
  if (matched.length > 1) {
    const key = `row:${rowNumber}:client:${displayName}`;
    const resolvedId = clientResolutions?.[key];
    if (resolvedId && matched.some((m) => m.id === resolvedId)) {
      return { kind: "existing", id: resolvedId, displayName };
    }
    conflicts.push({
      key,
      rowNumber,
      rawName: displayName,
      candidates: matched.map((m) => ({
        id: m.id,
        label: `${m.first_name}${m.last_name ? ` ${m.last_name}` : ""}`,
      })),
    });
    return null;
  }
  const tempKey = `new:${displayName}`;
  if (!newClients.has(tempKey)) {
    newClients.set(tempKey, {
      displayName,
      firstName: parsed.firstName,
      lastName: parsed.lastInitial ? null : null,
    });
  }
  return {
    kind: "new",
    tempKey,
    displayName,
    firstName: parsed.firstName,
    lastName: null,
  };
}

function addTreatmentCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function analyzePrivateProfile(
  params: TipulimAnalyzeParams,
  ctx: {
    isPrivateClinic: boolean;
    clients: ClientCandidate[];
    programsByJob: Array<{ id: string; name: string; job_id: string }>;
    bankAccounts: Array<{ id: string; account_number: string | null }>;
    digitalMethods: Array<{ id: string; name: string }>;
  },
): Promise<AnalyzeScratch> {
  const rows = sheetRows(params.workbook, params.sheetName);
  const scratch: AnalyzeScratch = {
    rows,
    warnings: [],
    errors: [],
    conflicts: [],
    treatmentCountsByDisplay: new Map(),
    pendingTreatments: new Map(),
    pendingReceipts: [],
    newClients: new Map(),
    autoPrograms: new Map(),
    routing: { travel: 0, consultations: 0 },
    pendingTravel: [],
    pendingConsultations: [],
  };
  const pendingAllocByReceipt = new Map<string, PendingAllocation[]>();
  const existingPrograms = ctx.programsByJob.filter((p) => p.job_id === params.jobId);
  let selectedProgramId = params.selectedProgramId ?? null;
  if (!selectedProgramId && existingPrograms.length > 0) {
    selectedProgramId = existingPrograms[0]!.id;
  }

  // Pass 1 (top → bottom): treatments + receipt allocations. Order-independent from anchor rows.
  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx]!;
    const rowNumber = idx + 2;
    const receiptNum = s(row["קבלה"]);
    const receiptKey = receiptMatchKey(row["קבלה"]);
    const paymentDateCell = row["תאריך תשלום"];
    const paymentDateRaw = s(paymentDateCell);
    const amountRaw = s(row["סכום"]);
    const clientRaw = s(row["מטופל"]);
    const dateCell = row["תאריך"];
    const dateRaw = s(dateCell);
    const visitRaw = s(row["סוג ביקור"]);
    const noteRaw = s(row["הערות"]) || null;
    const payRoute = s(row["דרך תשלום"]);
    const amount = parseMoney(amountRaw);

    const clientRef = await resolveClientRef(
      clientRaw,
      rowNumber,
      ctx.clients,
      scratch.newClients,
      scratch.conflicts,
      params.clientResolutions,
    );

    if (receiptNum && !amount) continue;

    const occurredAt = parseDateFromCell(dateCell);
    const hasDateCell =
      (dateRaw && dateRaw.length > 0) || dateCell instanceof Date || typeof dateCell === "number";
    if (amount && hasDateCell) {
      if (!occurredAt) {
        scratch.errors.push(`Row ${rowNumber}: invalid treatment date.`);
        continue;
      }
      let vt = visitTypeFromCell(visitRaw);
      if (!vt && !visitRaw.trim()) {
        if (params.missingVisitType) {
          vt = params.missingVisitType;
          scratch.warnings.push(`Row ${rowNumber}: missing visit type, used fallback "${params.missingVisitType}".`);
        } else {
          scratch.errors.push(
            `Row ${rowNumber}: missing visit type. Choose a fallback visit type in the import dialog and analyze again.`,
          );
          continue;
        }
      }
      if (!vt) {
        scratch.errors.push(`Row ${rowNumber}: unknown visit type "${visitRaw}".`);
        continue;
      }
      if (!clientRef) continue;
      const display = clientRef.displayName;
      addTreatmentCount(scratch.treatmentCountsByDisplay, display);
      const tKey = `${display}|${monthKey(occurredAt)}|${amount}|${vt}`;
      if (!scratch.pendingTreatments.has(tKey)) {
        scratch.pendingTreatments.set(tKey, {
          key: tKey,
          clientRef,
          programName: null,
          occurredAt,
          amount,
          visitType: vt,
          note: noteRaw,
          paymentDate: null,
          paymentMethod: null,
          paymentBankAccountId: null,
          paymentDigitalMethodId: null,
        });
      }
      if (receiptKey) {
        const arr = pendingAllocByReceipt.get(receiptKey) ?? [];
        arr.push({ amount, treatmentKey: tKey });
        pendingAllocByReceipt.set(receiptKey, arr);
      }
      const hasPaymentDateCell =
        (paymentDateRaw && paymentDateRaw.length > 0) ||
        paymentDateCell instanceof Date ||
        typeof paymentDateCell === "number";
      if (hasPaymentDateCell) {
        const pd = parseDateFromCell(paymentDateCell);
        if (!pd) {
          scratch.errors.push(`Row ${rowNumber}: invalid payment date.`);
          continue;
        }
        const t = scratch.pendingTreatments.get(tKey);
        if (!t) continue;
        if (!receiptKey) {
          const payment = paymentMethodFromText(payRoute);
          if (payment.treatmentMethod) {
            const resolvedIds = resolveBankDigitalForParsedPayment(ctx, payment, rowNumber, scratch, payRoute);
            if (!resolvedIds.ok) continue;
            t.paymentMethod = payment.treatmentMethod;
            t.paymentBankAccountId = resolvedIds.bankId;
            t.paymentDigitalMethodId = resolvedIds.digitalId;
          } else if (norm(payRoute)) {
            scratch.warnings.push(
              `Row ${rowNumber}: payment route "${payRoute}" was not recognized; saved payment date without payment method.`,
            );
          }
          t.paymentDate = pd;
        }
      }
    }
  }

  // Pass 2 (top → bottom): receipt anchors (totals + allocations gathered in pass 1).
  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx]!;
    const rowNumber = idx + 2;
    const receiptNum = s(row["קבלה"]);
    const receiptKey = receiptMatchKey(row["קבלה"]);
    const paidRaw = s(row["שולם"]);
    const amountRaw = s(row["סכום"]);
    const amount = parseMoney(amountRaw);
    const dateCell = row["תאריך"];
    const paymentDateCell = row["תאריך תשלום"];
    const noteRaw = s(row["הערות"]) || null;
    const payRoute = s(row["דרך תשלום"]);

    const isAnchor = !!receiptNum && !amount;
    if (!isAnchor) continue;

    const issuedAt = parseDateFromCell(dateCell) ?? parseDateFromCell(paymentDateCell);
    const totalAmount = parseMoney(paidRaw);
    const payment = paymentMethodFromText(payRoute);
    if (!issuedAt || !totalAmount) {
      scratch.errors.push(`Row ${rowNumber}: payment anchor is missing valid date/total.`);
      continue;
    }
    if (!payment.receiptMethod) {
      scratch.errors.push(`Row ${rowNumber}: missing or unknown payment route for receipt #${receiptNum}.`);
      continue;
    }
    const resolvedIds = resolveBankDigitalForParsedPayment(ctx, payment, rowNumber, scratch, payRoute);
    if (!resolvedIds.ok) continue;
    const bankId = resolvedIds.bankId;
    const digitalId = resolvedIds.digitalId;

    const allocations = pendingAllocByReceipt.get(receiptKey) ?? [];
    const allocationSum = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
    if (allocations.length > 0 && Math.abs(allocationSum - Number(totalAmount)) > 0.01) {
      scratch.errors.push(
        `Row ${rowNumber}: receipt #${receiptNum} total ${totalAmount} does not match allocations ${allocationSum.toFixed(2)}.`,
      );
      continue;
    }
    scratch.pendingReceipts.push({
      key: receiptNum,
      rowNumber,
      receiptNumber: receiptNum,
      issuedAt,
      totalAmount,
      notes: noteRaw,
      paymentMethod: payment.receiptMethod,
      recipientType: ctx.isPrivateClinic ? "client" : "organization",
      coveredPeriodStart: null,
      coveredPeriodEnd: null,
      allocations: allocations.map((a) => ({
        amount: a.amount,
        treatmentKey: a.treatmentKey,
      })),
    });
    for (const a of allocations) {
      const t = scratch.pendingTreatments.get(a.treatmentKey);
      if (t) {
        t.paymentDate = issuedAt;
        t.paymentMethod = payment.treatmentMethod;
        t.paymentBankAccountId = bankId;
        t.paymentDigitalMethodId = digitalId;
      }
    }
  }
  return scratch;
}

export async function analyzePrivateProfileForTest(
  params: TipulimAnalyzeParams,
  ctx: {
    isPrivateClinic: boolean;
    clients: ClientCandidate[];
    programsByJob: Array<{ id: string; name: string; job_id: string }>;
    bankAccounts: Array<{ id: string; account_number: string | null }>;
    digitalMethods: Array<{ id: string; name: string }>;
  },
) {
  return analyzePrivateProfile(params, ctx);
}

async function analyzeOrgProfile(params: TipulimAnalyzeParams, ctx: {
  isPrivateClinic: boolean;
  clients: ClientCandidate[];
  programsByJob: Array<{ id: string; name: string; job_id: string }>;
  bankAccounts: Array<{ id: string; account_number: string | null }>;
  digitalMethods: Array<{ id: string; name: string }>;
}): Promise<AnalyzeScratch> {
  const rows = sheetRows(params.workbook, params.sheetName);
  const scratch: AnalyzeScratch = {
    rows,
    warnings: [],
    errors: [],
    conflicts: [],
    treatmentCountsByDisplay: new Map(),
    pendingTreatments: new Map(),
    pendingReceipts: [],
    newClients: new Map(),
    autoPrograms: new Map(),
    routing: { travel: 0, consultations: 0 },
    pendingTravel: [],
    pendingConsultations: [],
  };
  const existingProgramNames = new Set(
    ctx.programsByJob.filter((p) => p.job_id === params.jobId).map((p) => norm(p.name)),
  );
  const treatmentKeysByMonth = new Map<string, string[]>();
  for (let idx = rows.length - 1; idx >= 0; idx -= 1) {
    const row = rows[idx]!;
    const rowNumber = idx + 2;
    const programName = norm(s(row["תכנית"]));
    const visitType = norm(s(row["סוג ביקור"]));
    const clientRaw = s(row["מטופל"]);
    const amountRaw = s(row["סכום"]);
    const amount = parseMoney(amountRaw);
    const dateCell = row["תאריך"];
    const dateRaw = s(dateCell);
    const receiptNum = s(row["קבלה"]);
    const paymentDateCell = row["תאריך תשלום"];
    const payRoute = s(row["דרך תשלום"]);
    if (programName && programName !== "תשלום" && !existingProgramNames.has(programName)) {
      const e = scratch.autoPrograms.get(programName) ?? {
        name: programName,
        source: "sheet" as const,
        treatmentCount: 0,
      };
      scratch.autoPrograms.set(programName, e);
    }
    if (programName === "תשלום") {
      const d = parseDateFromCell(paymentDateCell) ?? parseDateFromCell(dateCell);
      const total = parseMoney(s(row["סכום"]) || s(row["שולם"]));
      const payment = paymentMethodFromText(payRoute);
      if (!d || !total || !receiptNum || !payment.receiptMethod) {
        scratch.errors.push(`Row ${rowNumber}: monthly payment row is missing required receipt fields.`);
        continue;
      }
      let bankId: string | null = null;
      let digitalId: string | null = null;
      if (payment.treatmentMethod === "bank_transfer") {
        if (payment.accountDigits) {
          const digits = normalizeDigits(payment.accountDigits);
          const matches = ctx.bankAccounts.filter((b) => {
            const v = normalizeDigits(b.account_number ?? "");
            return v.includes(digits) || digits.includes(v);
          });
          if (matches.length === 1) bankId = matches[0]!.id;
          else if (matches.length > 1) {
            scratch.errors.push(`Row ${rowNumber}: multiple bank accounts match ${payment.accountDigits}.`);
            continue;
          } else if (ctx.isPrivateClinic) {
            scratch.warnings.push(`Row ${rowNumber}: bank transfer account ${payment.accountDigits} not matched.`);
          } else {
            scratch.errors.push(`Row ${rowNumber}: bank transfer account ${payment.accountDigits} not matched.`);
            continue;
          }
        } else if (!ctx.isPrivateClinic) {
          scratch.errors.push(`Row ${rowNumber}: bank transfer must include account digits.`);
          continue;
        }
      }
      if (payment.treatmentMethod === "digital_payment") {
        const hint = payment.digitalHint?.toLowerCase() ?? "";
        const matches = ctx.digitalMethods.filter((m) => m.name.toLowerCase().includes(hint));
        if (matches.length === 1) digitalId = matches[0]!.id;
        else {
          scratch.errors.push(`Row ${rowNumber}: could not uniquely match digital payment method ${payRoute}.`);
          continue;
        }
      }
      const coveredMonthRaw = s(dateCell);
      const coveredMonth = parseCoveredMonth(coveredMonthRaw);
      const coveredMonthKey = coveredMonth ? `${coveredMonth.start.getUTCFullYear()}-${String(coveredMonth.start.getUTCMonth() + 1).padStart(2, "0")}` : null;
      const treatmentKeys = coveredMonthKey ? (treatmentKeysByMonth.get(coveredMonthKey) ?? []) : [];
      scratch.pendingReceipts.push({
        key: `org:${receiptNum}`,
        rowNumber,
        receiptNumber: receiptNum,
        issuedAt: d,
        totalAmount: total,
        notes: s(row["הערות"]) || null,
        paymentMethod: payment.receiptMethod,
        recipientType: ctx.isPrivateClinic ? "client" : "organization",
        coveredPeriodStart: coveredMonth?.start ?? null,
        coveredPeriodEnd: coveredMonth?.end ?? null,
        allocations: [],
        treatmentKeysToMarkPaid: treatmentKeys,
        treatmentPaymentMethod: payment.treatmentMethod,
        treatmentBankAccountId: bankId,
        treatmentDigitalMethodId: digitalId,
      });
      continue;
    }
    const hasOrgDate =
      (dateRaw && dateRaw.length > 0) || dateCell instanceof Date || typeof dateCell === "number";
    if (!amount || !hasOrgDate) continue;
    const occurredAt = parseDateFromCell(dateCell);
    if (!occurredAt) continue;
    const clientRef = await resolveClientRef(
      clientRaw,
      rowNumber,
      ctx.clients,
      scratch.newClients,
      scratch.conflicts,
      params.clientResolutions,
    );
    const v = visitType;
    const treatmentLike = new Set(["ביקור בית", "ייעוץ טלפוני", "מקוון (וידאו)"]);
    if (treatmentLike.has(v)) {
      let vt = visitTypeFromCell(v);
      if (!vt && !v) {
        if (params.missingVisitType) {
          vt = params.missingVisitType;
          scratch.warnings.push(`Row ${rowNumber}: missing visit type, used fallback "${params.missingVisitType}".`);
        } else {
          scratch.errors.push(
            `Row ${rowNumber}: missing visit type. Choose a fallback visit type in the import dialog and analyze again.`,
          );
          continue;
        }
      }
      if (!vt) {
        scratch.errors.push(`Row ${rowNumber}: unknown treatment visit type ${visitType}.`);
        continue;
      }
      if (!clientRef) continue;
      const key = `${clientRef.displayName}|${monthKey(occurredAt)}|${amount}|${vt}`;
      scratch.pendingTreatments.set(key, {
        key,
        clientRef,
        programName: programName || null,
        occurredAt,
        amount,
        visitType: vt,
        note: s(row["הערות"]) || null,
        paymentDate: null,
        paymentMethod: null,
        paymentBankAccountId: null,
        paymentDigitalMethodId: null,
      });
      addTreatmentCount(scratch.treatmentCountsByDisplay, clientRef.displayName);
      const month = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const arr = treatmentKeysByMonth.get(month) ?? [];
      arr.push(key);
      treatmentKeysByMonth.set(month, arr);
      const ap = scratch.autoPrograms.get(programName);
      if (ap) ap.treatmentCount += 1;
      continue;
    }
    if (v === "נסיעה") {
      let linkedTreatmentKey: string | null = null;
      if (clientRef && occurredAt) {
        linkedTreatmentKey = `${clientRef.displayName}|${monthKey(occurredAt)}|${amount}|home`;
      }
      scratch.pendingTravel.push({
        occurredAt,
        amount,
        note: s(row["הערות"]) || null,
        treatmentKey: linkedTreatmentKey,
      });
      scratch.routing.travel += 1;
      continue;
    }
    const consultLike = new Set(["התייעצות", "ישיבת צוות", "הדרכה", "פגישה", "אירוע", "בונוס", "חבר מביא חבר"]);
    if (consultLike.has(v) || v) {
      scratch.pendingConsultations.push({
        occurredAt,
        amount,
        note: s(row["הערות"]) || null,
        typeName: v || "other",
      });
      scratch.routing.consultations += 1;
    } else {
      scratch.errors.push(`Row ${rowNumber}: unsupported visit type "${visitType}".`);
    }
  }
  return scratch;
}

function makeSummary(scratch: AnalyzeScratch): TipulimAnalyzeResult {
  const treatmentsPerClient = Array.from(scratch.treatmentCountsByDisplay.entries()).map(([displayName, count]) => ({
    displayName,
    clientId: null,
    count,
  }));
  return {
    newClientsCount: scratch.newClients.size,
    treatmentsTotal: Array.from(scratch.treatmentCountsByDisplay.values()).reduce((a, b) => a + b, 0),
    treatmentsPerClient,
    receiptsToCreateCount: scratch.pendingReceipts.length,
    programsToAutoCreate: Array.from(scratch.autoPrograms.values()),
    warnings: scratch.warnings,
    blockingErrors: scratch.errors,
    clientConflicts: scratch.conflicts,
    routing:
      scratch.routing.travel || scratch.routing.consultations
        ? { travelEntriesCount: scratch.routing.travel, consultationEntriesCount: scratch.routing.consultations }
        : undefined,
  };
}

export async function analyzeTipulimImport(params: TipulimAnalyzeParams): Promise<TipulimAnalyzeResult> {
  const [job, clients, programsByJob, bankAccounts, digitalMethods] = await Promise.all([
    prisma.jobs.findFirst({
      where: { id: params.jobId, household_id: params.householdId },
      select: { is_private_clinic: true },
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: params.householdId },
      select: { id: true, first_name: true, last_name: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: params.householdId },
      select: { id: true, name: true, job_id: true },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: params.householdId, is_active: true },
      select: { id: true, account_number: true },
    }),
    prisma.digital_payment_methods.findMany({
      where: { household_id: params.householdId, is_active: true },
      select: { id: true, name: true },
    }),
  ]);
  const ctx = {
    isPrivateClinic: job?.is_private_clinic ?? true,
    clients,
    programsByJob,
    bankAccounts,
    digitalMethods,
  };
  const scratch =
    params.profile === "tipulim_org_monthly"
      ? await analyzeOrgProfile(params, ctx)
      : await analyzePrivateProfile(params, ctx);
  return makeSummary(scratch);
}

async function getOrCreateProgramId(
  tx: PrismaClient,
  householdId: string,
  jobId: string,
  selectedProgramId: string | null | undefined,
  autoPrograms: ProgramsToAutoCreate[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (selectedProgramId) {
    map.set("__default__", selectedProgramId);
    return map;
  }
  const existing = await tx.therapy_service_programs.findMany({
    where: { household_id: householdId, job_id: jobId },
    select: { id: true, name: true },
  });
  if (existing.length > 0) {
    map.set("__default__", existing[0]!.id);
    for (const p of existing) map.set(norm(p.name), p.id);
  }
  for (const p of autoPrograms) {
    const key = norm(p.name);
    if (map.has(key)) continue;
    const created = await tx.therapy_service_programs.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        job_id: jobId,
        name: p.name,
        sort_order: 0,
        is_active: true,
      },
      select: { id: true, name: true },
    });
    map.set(key, created.id);
    if (!map.has("__default__")) map.set("__default__", created.id);
  }
  return map;
}

export async function commitTipulimImport(params: TipulimAnalyzeParams): Promise<TipulimCommitResult> {
  const analysis = await analyzeTipulimImport(params);
  if (analysis.clientConflicts.length > 0 || analysis.blockingErrors.length > 0) {
    return {
      ...analysis,
      created: { clients: 0, treatments: 0, receipts: 0, allocations: 0, travel: 0, consultations: 0, programs: 0 },
    };
  }
  const [job, clients, programsByJob, bankAccounts, digitalMethods, consultationTypes] = await Promise.all([
    prisma.jobs.findFirst({
      where: { id: params.jobId, household_id: params.householdId },
      select: { is_private_clinic: true },
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: params.householdId },
      select: { id: true, first_name: true, last_name: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: params.householdId },
      select: { id: true, name: true, job_id: true },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: params.householdId, is_active: true },
      select: { id: true, account_number: true },
    }),
    prisma.digital_payment_methods.findMany({
      where: { household_id: params.householdId, is_active: true },
      select: { id: true, name: true },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: params.householdId },
      select: { id: true, name: true, name_he: true },
    }),
  ]);
  const ctx = {
    isPrivateClinic: job?.is_private_clinic ?? true,
    clients,
    programsByJob,
    bankAccounts,
    digitalMethods,
  };
  const scratch =
    params.profile === "tipulim_org_monthly"
      ? await analyzeOrgProfile(params, ctx)
      : await analyzePrivateProfile(params, ctx);
  const summary = makeSummary(scratch);
  if (summary.clientConflicts.length > 0 || summary.blockingErrors.length > 0) {
    return {
      ...summary,
      created: { clients: 0, treatments: 0, receipts: 0, allocations: 0, travel: 0, consultations: 0, programs: 0 },
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    const createdCount = {
      clients: 0,
      treatments: 0,
      receipts: 0,
      allocations: 0,
      travel: 0,
      consultations: 0,
      programs: 0,
    };
    const programCountBefore = await tx.therapy_service_programs.count({
      where: { household_id: params.householdId, job_id: params.jobId },
    });
    const programMap = await getOrCreateProgramId(
      tx as unknown as PrismaClient,
      params.householdId,
      params.jobId,
      params.selectedProgramId ?? null,
      summary.programsToAutoCreate,
    );
    const programCountAfter = await tx.therapy_service_programs.count({
      where: { household_id: params.householdId, job_id: params.jobId },
    });
    createdCount.programs = programCountAfter - programCountBefore;

    const clientIdByKey = new Map<string, string>();
    for (const [k, v] of scratch.newClients.entries()) {
      const createdClient = await tx.therapy_clients.create({
        data: {
          id: crypto.randomUUID(),
          household_id: params.householdId,
          first_name: v.firstName,
          last_name: v.lastName,
          default_job_id: params.jobId,
          default_program_id: programMap.get("__default__") ?? null,
          is_active: true,
        },
        select: { id: true },
      });
      await tx.therapy_clients_jobs.create({
        data: {
          id: crypto.randomUUID(),
          household_id: params.householdId,
          client_id: createdClient.id,
          job_id: params.jobId,
          is_primary: true,
        },
      });
      clientIdByKey.set(k, createdClient.id);
      createdCount.clients += 1;
    }

    const treatmentIdByKey = new Map<string, string>();
    for (const t of scratch.pendingTreatments.values()) {
      const clientId =
        t.clientRef.kind === "existing" ? t.clientRef.id : clientIdByKey.get(t.clientRef.tempKey) ?? null;
      if (!clientId) continue;
      const defaultProg = programMap.get("__default__") ?? null;
      const programIdForRow = t.programName
        ? (programMap.get(norm(t.programName)) ?? defaultProg)
        : defaultProg;
      const row = await tx.therapy_treatments.create({
        data: {
          id: crypto.randomUUID(),
          household_id: params.householdId,
          client_id: clientId,
          job_id: params.jobId,
          program_id: programIdForRow,
          occurred_at: t.occurredAt,
          amount: t.amount,
          currency: "ILS",
          visit_type: t.visitType,
          note_1: t.note,
          payment_date: t.paymentDate,
          payment_method: t.paymentMethod,
          payment_bank_account_id: t.paymentBankAccountId,
          payment_digital_payment_method_id: t.paymentDigitalMethodId,
        },
        select: { id: true },
      });
      treatmentIdByKey.set(t.key, row.id);
      createdCount.treatments += 1;
    }

    const consultationTypeIdByName = new Map<string, string>();
    for (const ct of consultationTypes) {
      consultationTypeIdByName.set(norm(ct.name_he || ct.name), ct.id);
      consultationTypeIdByName.set(norm(ct.name), ct.id);
    }
    for (const c of scratch.pendingConsultations) {
      const lookup = norm(c.typeName);
      let typeId = consultationTypeIdByName.get(lookup) ?? null;
      if (!typeId) {
        const createdType = await tx.therapy_consultation_types.create({
          data: {
            id: crypto.randomUUID(),
            household_id: params.householdId,
            name: consultationTypeKey(c.typeName),
            name_he: c.typeName,
            sort_order: 0,
            is_system: false,
          },
          select: { id: true },
        });
        typeId = createdType.id;
        consultationTypeIdByName.set(lookup, typeId);
      }
      await tx.therapy_consultations.create({
        data: {
          id: crypto.randomUUID(),
          household_id: params.householdId,
          job_id: params.jobId,
          consultation_type_id: typeId,
          occurred_at: c.occurredAt,
          income_amount: c.amount,
          income_currency: "ILS",
          notes: c.note,
        },
      });
      createdCount.consultations += 1;
    }

    for (const tr of scratch.pendingTravel) {
      await tx.therapy_travel_entries.create({
        data: {
          id: crypto.randomUUID(),
          household_id: params.householdId,
          job_id: params.jobId,
          treatment_id: tr.treatmentKey ? treatmentIdByKey.get(tr.treatmentKey) ?? null : null,
          occurred_at: tr.occurredAt,
          amount: tr.amount,
          currency: "ILS",
          notes: tr.note,
        },
      });
      createdCount.travel += 1;
    }

    for (const r of scratch.pendingReceipts) {
      const receipt = await tx.therapy_receipts.create({
        data: {
          id: crypto.randomUUID(),
          household_id: params.householdId,
          job_id: params.jobId,
          receipt_number: r.receiptNumber,
          issued_at: r.issuedAt,
          total_amount: r.totalAmount,
          currency: "ILS",
          recipient_type: r.recipientType,
          payment_method: r.paymentMethod,
          covered_period_start: r.coveredPeriodStart ?? null,
          covered_period_end: r.coveredPeriodEnd ?? null,
          notes: r.notes,
        },
        select: { id: true },
      });
      createdCount.receipts += 1;
      for (const a of r.allocations) {
        const treatmentId = treatmentIdByKey.get(a.treatmentKey);
        if (!treatmentId) continue;
        await tx.therapy_receipt_allocations.create({
          data: {
            id: crypto.randomUUID(),
            household_id: params.householdId,
            receipt_id: receipt.id,
            treatment_id: treatmentId,
            amount: a.amount,
          },
        });
        createdCount.allocations += 1;
      }
      if (r.treatmentKeysToMarkPaid && r.treatmentKeysToMarkPaid.length > 0) {
        for (const tKey of r.treatmentKeysToMarkPaid) {
          const treatmentId = treatmentIdByKey.get(tKey);
          if (!treatmentId) continue;
          await tx.therapy_treatments.update({
            where: { id: treatmentId },
            data: {
              payment_date: r.issuedAt,
              payment_method: r.treatmentPaymentMethod ?? null,
              payment_bank_account_id: r.treatmentBankAccountId ?? null,
              payment_digital_payment_method_id: r.treatmentDigitalMethodId ?? null,
            },
          });
        }
      }
    }

    const touchedClientIds = new Set<string>();
    for (const t of scratch.pendingTreatments.values()) {
      const clientId =
        t.clientRef.kind === "existing" ? t.clientRef.id : clientIdByKey.get(t.clientRef.tempKey) ?? null;
      if (clientId) touchedClientIds.add(clientId);
    }
    const now = new Date();
    const twoMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, now.getUTCDate()));
    function utcDay(d: Date): Date {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    for (const clientId of touchedClientIds) {
      const firstTx = await tx.therapy_treatments.findFirst({
        where: { household_id: params.householdId, job_id: params.jobId, client_id: clientId },
        orderBy: { occurred_at: "asc" },
        select: { occurred_at: true },
      });
      const lastTx = await tx.therapy_treatments.findFirst({
        where: { household_id: params.householdId, job_id: params.jobId, client_id: clientId },
        orderBy: { occurred_at: "desc" },
        select: { occurred_at: true },
      });
      if (!firstTx || !lastTx) continue;
      const existing = await tx.therapy_clients.findUnique({
        where: { id: clientId },
        select: { start_date: true },
      });
      const earliestOcc = utcDay(firstTx.occurred_at);
      let newStart = earliestOcc;
      if (existing?.start_date) {
        const ex = utcDay(existing.start_date);
        newStart = new Date(Math.min(ex.getTime(), earliestOcc.getTime()));
      }
      const lastDay = utcDay(lastTx.occurred_at);
      const recent = lastTx.occurred_at.getTime() >= twoMonthsAgo.getTime();
      await tx.therapy_clients.update({
        where: { id: clientId },
        data: {
          start_date: newStart,
          end_date: recent ? null : lastDay,
          is_active: recent,
        },
      });
    }

    return createdCount;
  });

  return {
    ...summary,
    created,
  };
}

