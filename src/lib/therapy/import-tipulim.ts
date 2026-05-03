import { prisma } from "@/lib/auth";
import type { PrismaClient } from "@/generated/prisma/client";
import { getSystemDefaultSessionMinutes, resolveSessionDurationMinutes } from "@/lib/therapy/session-duration";
import * as XLSX from "xlsx";

export type TipulimImportProfile = "tipulim_private" | "tipulim_org_monthly" | "tipulim_receipts_only";
export type TipulimDateFormatPreference = "auto" | "dmy" | "mdy";

// Optional columns treatmentDate01, treatmentDate02, … are also supported (see collectReceiptTreatmentDateColumnEntries).
const RECEIPTS_IMPORT_HEADERS = [
  "Payment Date",
  "Client",
  "Amount",
  "Receipt #",
  "Notes",
  "Payment method",
  "treatmentDate01",
  "treatmentTime01",
] as const;

const TIPULIM_PRIVATE_HEADERS = [
  "קבלה",
  "תאריך תשלום",
  "שולם",
  "סכום",
  "מטופל",
  "תאריך",
  "שעה",
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
  "שעה",
  "קבלה",
  "תאריך תשלום",
  "דרך תשלום",
  "הערות",
] as const;

/** UTF-8 CSV with BOM: header row only, matching the parser column names. */
export function tipulimImportExampleCsv(profile: TipulimImportProfile): string {
  const headers =
    profile === "tipulim_org_monthly"
      ? TIPULIM_ORG_MONTHLY_HEADERS
      : profile === "tipulim_receipts_only"
        ? RECEIPTS_IMPORT_HEADERS
        : TIPULIM_PRIVATE_HEADERS;
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
  rowNumber: number;
  clientRef: ClientRef;
  programName: string | null;
  occurredAt: Date;
  /** `null` when fee is unknown (receipt import multi-date share above usual ×110%). */
  amount: string | null;
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

type PendingConsultationAllocation = {
  amount: string;
  consultationKey: string;
};

type PendingTravelAllocation = {
  amount: string;
  travelKey: string;
};

type PendingTravel = {
  key: string;
  rowNumber: number;
  occurredAt: Date | null;
  amount: string | null;
  note: string | null;
  clientRef: ClientRef | null;
  treatmentKey: string | null;
};

type PendingConsultation = {
  key: string;
  occurredAt: Date;
  amount: string;
  note: string | null;
  typeName: string;
  clientRef: ClientRef | null;
};

type PendingOrgPaymentRow = {
  rowNumber: number;
  receiptNum: string;
  total: string;
  issuedAt: Date;
  payRoute: string;
  note: string | null;
  coveredMonthRaw: string;
};

type PendingReceipt = {
  key: string;
  rowNumber: number;
  receiptNumber: string;
  issuedAt: Date;
  totalAmount: string;
  netAmount?: string;
  receiptKind?: "regular" | "salary_fictitious";
  notes: string | null;
  paymentMethod: "cash" | "bank_transfer" | "digital_card" | "credit_card";
  recipientType: "client" | "organization";
  coveredPeriodStart?: Date | null;
  coveredPeriodEnd?: Date | null;
  allocations: PendingAllocation[];
  consultationAllocations?: PendingConsultationAllocation[];
  travelAllocations?: PendingTravelAllocation[];
  treatmentKeysToMarkPaid?: string[];
  treatmentPaymentMethod?: "bank_transfer" | "digital_payment" | null;
  treatmentBankAccountId?: string | null;
  treatmentDigitalMethodId?: string | null;
  /** Receipt-only import: when no auto-treatment, client comes from the row (not from allocations). */
  explicitClientRefForReceipt?: ClientRef | null;
  /**
   * Receipt-only import: multi-date row where per-session share exceeds usual fee ×110%.
   * Treatments are created with no session amount and no receipt allocations until edited manually.
   */
  omitTreatmentAmountsAndAllocations?: boolean;
};

function defaultReceiptKindForJobEmploymentType(
  employmentType: "freelancer" | "employee" | "self_employed" | "contractor_via_company" | null | undefined,
): "regular" | "salary_fictitious" {
  return employmentType === "employee" ? "salary_fictitious" : "regular";
}

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
  treatmentsPerClient: Array<{
    displayName: string;
    clientId: string | null;
    count: number;
    majorityVisitType: "clinic" | "home" | "phone" | "video" | null;
  }>;
  receiptsToCreateCount: number;
  programsToAutoCreate: ProgramsToAutoCreate[];
  warnings: string[];
  blockingErrors: string[];
  clientConflicts: ImportConflict[];
  routing?: {
    travelEntriesCount: number;
    consultationEntriesCount: number;
  };
  /** Receipt-only import: receipts where amount exceeded usual cost +10% (no auto-treatment). */
  receiptsNeedingManualTreatmentCount?: number;
  importDebug?: {
    unlinkedReceiptsCount: number;
    unlinkedReceiptsSample: Array<{ rowNumber: number; receiptNumber: string }>;
    orgPaymentDiagnosticsSample?: Array<{
      rowNumber: number;
      receiptNumber: string;
      coveredMonthRaw: string;
      coveredMonthKey: string | null;
      fallbackIssuedMonthKey: string;
      monthKeyUsed: string;
      matchedTreatments: number;
      matchedConsultations?: number;
      matchedTravel?: number;
      matchedTreatmentsAmount?: string;
      matchedConsultationsAmount?: string;
      matchedTravelAmount?: string;
    }>;
    commitLinkDiagnostics?: {
      allocationsMissingTreatmentKey: number;
      markPaidMissingTreatmentKey: number;
      missingTreatmentKeysSample: string[];
    };
    travelLinkDiagnosticsSample?: Array<{
      rowNumber: number;
      client: string;
      date: string;
      linkedToTreatment: boolean;
      source: "pending_import" | "existing_db" | "none";
    }>;
  };
};

export type TipulimCommitResult = TipulimAnalyzeResult & {
  created: {
    clients: number;
    treatments: number;
    appointments: number;
    receipts: number;
    allocations: number;
    consultationAllocations: number;
    travelAllocations: number;
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
  /** Decimal string e.g. "400.00"; required for `tipulim_receipts_only`. */
  usualTreatmentCost?: string | null;
  /** Date parsing preference for ambiguous numeric text dates (receipt import). */
  dateFormatPreference?: TipulimDateFormatPreference | null;
  /** Create completed appointments linked to newly created imported treatments. */
  createCompletedAppointments?: boolean;
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
  return receiptMatchKeys(raw)[0] ?? "";
}

function receiptMatchKeys(raw: unknown): string[] {
  const base = String(raw ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .trim();
  if (!base) return [];
  const out = new Set<string>();
  out.add(norm(base).toLowerCase());
  const noPrefix = base.replace(/^'+/, "").replace(/^#+/, "");
  const tight = noPrefix.replace(/\s+/g, "");
  if (tight) out.add(tight.toLowerCase());
  const noExcelFraction = tight.replace(/\.0+$/, "");
  if (noExcelFraction) out.add(noExcelFraction.toLowerCase());
  const digits = normalizeDigits(noExcelFraction);
  if (digits) out.add(digits.replace(/^0+/, "") || "0");
  return Array.from(out).filter((k) => k.length > 0);
}

function parseMoney(raw: string): string | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

/** Split a decimal money string into `parts` equal shares (last shares absorb cent remainder). */
function splitMoneyEqualParts(totalAmount: string, parts: number): string[] | null {
  if (parts < 1) return null;
  const totalCents = Math.round(Number(totalAmount) * 100);
  if (!Number.isFinite(totalCents)) return null;
  const base = Math.floor(totalCents / parts);
  const rem = totalCents % parts;
  const out: string[] = [];
  for (let i = 0; i < parts; i += 1) {
    const cents = base + (i < rem ? 1 : 0);
    out.push((cents / 100).toFixed(2));
  }
  return out;
}

/** Ordered treatment-date columns: `treatmentDate01`, `Treatment Date 02`, `treatment_date_3`, etc. */
function collectReceiptTreatmentDateColumnEntries(
  row: Row,
): Array<{ order: number; label: string; cell: unknown }> {
  const entries: Array<{ order: number; label: string; cell: unknown }> = [];
  for (const k of Object.keys(row)) {
    const compact = norm(String(k))
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/_/g, "");
    const m = compact.match(/^treatmentdate(\d+)$/);
    if (!m) continue;
    const order = parseInt(m[1]!, 10);
    if (!Number.isFinite(order) || order < 1) continue;
    const cell = row[k];
    if (cell === undefined || cell === null || String(cell).trim() === "") continue;
    const label = `treatmentDate${String(order).padStart(2, "0")}`;
    entries.push({ order, label, cell });
  }
  entries.sort((a, b) => a.order - b.order);
  return entries;
}

/** Ordered treatment-time columns: `treatmentTime01`, `Treatment Time 02`, `treatment_time_3`, etc. */
function collectReceiptTreatmentTimeColumnEntries(
  row: Row,
): Array<{ order: number; label: string; cell: unknown }> {
  const entries: Array<{ order: number; label: string; cell: unknown }> = [];
  for (const k of Object.keys(row)) {
    const compact = norm(String(k))
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/_/g, "");
    const m = compact.match(/^treatmenttime(\d+)$/);
    if (!m) continue;
    const order = parseInt(m[1]!, 10);
    if (!Number.isFinite(order) || order < 1) continue;
    const cell = row[k];
    if (cell === undefined || cell === null || String(cell).trim() === "") continue;
    const label = `treatmentTime${String(order).padStart(2, "0")}`;
    entries.push({ order, label, cell });
  }
  entries.sort((a, b) => a.order - b.order);
  return entries;
}

/** Excel 1900 date system (SheetJS / Excel): whole days since 1899-12-30 → UTC midnight for that calendar day. */
function excelSerialToUtcDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  const whole = Math.floor(serial);
  if (whole < 1 || whole > 1000000) return null;
  const fraction = serial - whole;
  const ms = (whole - 25569) * 86400 * 1000 + Math.round(fraction * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1980 || y > 2100) return null;
  return d;
}

const IMPORT_TIME_ZONE = "Asia/Jerusalem";

function parseHms(raw: string): { hour: number; minute: number; second: number } | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = Number(m[3] ?? "0");
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }
  return { hour, minute, second };
}

function timePartsFromExcelFraction(serial: number): { hour: number; minute: number; second: number } | null {
  if (!Number.isFinite(serial)) return null;
  const frac = serial - Math.floor(serial);
  if (frac < 0 || frac >= 1) return null;
  const totalSeconds = Math.round(frac * 86400);
  const normalized = ((totalSeconds % 86400) + 86400) % 86400;
  const hour = Math.floor(normalized / 3600);
  const minute = Math.floor((normalized % 3600) / 60);
  const second = normalized % 60;
  return { hour, minute, second };
}

function getTzDateParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
    hour: Number(map.get("hour")),
    minute: Number(map.get("minute")),
    second: Number(map.get("second")),
  };
}

function zonedTimeToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date | null {
  if (
    year < 1980 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }
  const targetUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guessMs = targetUtcMs;
  for (let i = 0; i < 2; i += 1) {
    const guess = new Date(guessMs);
    const parts = getTzDateParts(guess, timeZone);
    const asUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const offsetMs = asUtcMs - guessMs;
    guessMs = targetUtcMs - offsetMs;
  }
  const out = new Date(guessMs);
  return Number.isNaN(out.getTime()) ? null : out;
}

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?:[ T]+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
  if (m) {
    const day = parseInt(m[1]!, 10);
    const month = parseInt(m[2]!, 10) - 1;
    let year = parseInt(m[3]!, 10);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (!m[4]) {
      const dt = new Date(Date.UTC(year, month, day));
      if (!Number.isNaN(dt.getTime())) return dt;
    } else {
      const time = parseHms(m[4]);
      if (!time) return null;
      const dt = zonedTimeToUtcDate(year, month + 1, day, time.hour, time.minute, time.second, IMPORT_TIME_ZONE);
      if (dt && !Number.isNaN(dt.getTime())) return dt;
    }
  }
  const isoWithTime = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (isoWithTime) {
    const year = Number(isoWithTime[1]);
    const month = Number(isoWithTime[2]);
    const day = Number(isoWithTime[3]);
    if (!isoWithTime[4]) {
      const dt = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(dt.getTime())) return dt;
    } else {
      const hour = Number(isoWithTime[4]);
      const minute = Number(isoWithTime[5]);
      const second = Number(isoWithTime[6] ?? "0");
      const dt = zonedTimeToUtcDate(year, month, day, hour, minute, second, IMPORT_TIME_ZONE);
      if (dt) return dt;
    }
  }
  const isoWithZone = trimmed.match(/([zZ]|[+\-]\d{2}:?\d{2})$/);
  if (isoWithZone) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // CSV sometimes stores Excel serials as plain digits (e.g. "45321").
  if (/^\d{5,7}(\.\d+)?$/.test(trimmed.replace(/,/g, ""))) {
    const n = Number(trimmed.replace(/,/g, ""));
    if (Number.isFinite(n)) {
      const fromExcel = excelSerialToUtcDate(n);
      if (fromExcel) return fromExcel;
    }
  }
  return null;
}

function parseDateWithPreference(
  raw: string,
  preference: TipulimDateFormatPreference,
): { date: Date | null; ambiguous: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { date: null, ambiguous: false };
  const m = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?:[ T]+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
  if (m) {
    const a = parseInt(m[1]!, 10);
    const b = parseInt(m[2]!, 10);
    let year = parseInt(m[3]!, 10);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const ambiguous = a >= 1 && a <= 12 && b >= 1 && b <= 12;
    if (preference === "auto" && ambiguous) return { date: null, ambiguous: true };
    const useDmy = preference === "dmy" || (preference === "auto" && a > 12);
    const useMdy = preference === "mdy" || (preference === "auto" && b > 12);
    if (useDmy || useMdy) {
      const day = useDmy ? a : b;
      const month = (useDmy ? b : a) - 1;
      if (!m[4]) {
        const dt = new Date(Date.UTC(year, month, day));
        if (!Number.isNaN(dt.getTime())) return { date: dt, ambiguous: false };
      } else {
        const time = parseHms(m[4]);
        if (!time) return { date: null, ambiguous: false };
        const dt = zonedTimeToUtcDate(year, month + 1, day, time.hour, time.minute, time.second, IMPORT_TIME_ZONE);
        if (dt && !Number.isNaN(dt.getTime())) return { date: dt, ambiguous: false };
      }
      return { date: null, ambiguous: false };
    }
  }
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (iso) {
    const year = parseInt(iso[1]!, 10);
    const month = parseInt(iso[2]!, 10);
    const day = parseInt(iso[3]!, 10);
    if (!iso[4]) {
      const dt = new Date(Date.UTC(year, month - 1, day));
      return { date: Number.isNaN(dt.getTime()) ? null : dt, ambiguous: false };
    }
    const hour = parseInt(iso[4], 10);
    const minute = parseInt(iso[5], 10);
    const second = parseInt(iso[6] ?? "0", 10);
    const dt = zonedTimeToUtcDate(year, month, day, hour, minute, second, IMPORT_TIME_ZONE);
    return { date: dt && !Number.isNaN(dt.getTime()) ? dt : null, ambiguous: false };
  }
  return { date: parseDate(trimmed), ambiguous: false };
}

function parseReceiptDateCell(
  cell: unknown,
  preference: TipulimDateFormatPreference,
): { date: Date | null; ambiguous: boolean } {
  if (cell == null || cell === "") return { date: null, ambiguous: false };
  if (cell instanceof Date) {
    return { date: Number.isNaN(cell.getTime()) ? null : cell, ambiguous: false };
  }
  if (typeof cell === "number" && Number.isFinite(cell)) {
    const whole = Math.floor(cell);
    if (whole >= 20000 && whole < 1000000) {
      return { date: excelSerialToUtcDate(cell), ambiguous: false };
    }
    return { date: null, ambiguous: false };
  }
  const txt = String(cell);
  if (/^\d{5,7}(\.\d+)?$/.test(txt.trim().replace(/,/g, ""))) {
    const n = Number(txt.trim().replace(/,/g, ""));
    if (Number.isFinite(n)) {
      return { date: excelSerialToUtcDate(n), ambiguous: false };
    }
  }
  return parseDateWithPreference(txt, preference);
}

/** Use for date columns: Excel serial numbers, Date cells, and locale date strings. */
function parseDateFromCell(v: unknown, timeCell?: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const parsedTime = parseTimeCell(timeCell);
    if (!parsedTime) return v;
    return mergeDateAndTime(v, parsedTime);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const whole = Math.floor(v);
    if (whole >= 20000 && whole < 1000000) {
      const base = excelSerialToUtcDate(v);
      if (!base) return null;
      const parsedTime = parseTimeCell(timeCell);
      if (!parsedTime) return base;
      return mergeDateAndTime(base, parsedTime);
    }
    return null;
  }
  const parsed = parseDate(String(v));
  if (!parsed) return null;
  const parsedTime = parseTimeCell(timeCell);
  if (!parsedTime) return parsed;
  return mergeDateAndTime(parsed, parsedTime);
}

function parseTimeCell(v: unknown): { hour: number; minute: number; second: number } | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return {
      hour: v.getUTCHours(),
      minute: v.getUTCMinutes(),
      second: v.getUTCSeconds(),
    };
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 0 && v < 1) return timePartsFromExcelFraction(v);
    if (v >= 20000 && v < 1000000) return timePartsFromExcelFraction(v);
    return null;
  }
  const text = String(v).trim();
  if (!text) return null;
  const plainTime = parseHms(text);
  if (plainTime) return plainTime;
  const dt = parseDate(text);
  if (!dt) return null;
  return {
    hour: dt.getUTCHours(),
    minute: dt.getUTCMinutes(),
    second: dt.getUTCSeconds(),
  };
}

function mergeDateAndTime(datePart: Date, timePart: { hour: number; minute: number; second: number }): Date | null {
  return zonedTimeToUtcDate(
    datePart.getUTCFullYear(),
    datePart.getUTCMonth() + 1,
    datePart.getUTCDate(),
    timePart.hour,
    timePart.minute,
    timePart.second,
    IMPORT_TIME_ZONE,
  );
}

function treatmentTimeCell(row: Row): unknown {
  const aliases = new Set(["שעה", "time", "treatment time", "treatmenttime"]);
  for (const k of Object.keys(row)) {
    const normalized = norm(String(k)).toLowerCase();
    const compact = normalized.replace(/\s+/g, "");
    if (aliases.has(normalized) || aliases.has(compact)) return row[k];
  }
  return null;
}

function parseCoveredMonth(raw: string): { start: Date; end: Date } | null {
  const t = raw.trim();
  if (!t) return null;
  // Excel serial values may appear in monthly-covered-period cells (e.g. "45322").
  if (/^\d{5,7}(\.\d+)?$/.test(t.replace(/,/g, ""))) {
    const n = Number(t.replace(/,/g, ""));
    if (Number.isFinite(n)) {
      const fromExcel = excelSerialToUtcDate(Math.floor(n));
      if (fromExcel) {
        const y = fromExcel.getUTCFullYear();
        const m = fromExcel.getUTCMonth();
        return {
          start: new Date(Date.UTC(y, m, 1)),
          end: new Date(Date.UTC(y, m + 1, 0)),
        };
      }
    }
  }
  const hebrewMonths: Record<string, number> = {
    ינואר: 1,
    פברואר: 2,
    מרץ: 3,
    אפריל: 4,
    מאי: 5,
    יוני: 6,
    יולי: 7,
    אוגוסט: 8,
    ספטמבר: 9,
    אוקטובר: 10,
    נובמבר: 11,
    דצמבר: 12,
  };
  const englishMonths: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const compact = t
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/[,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let year: number | null = null;
  let month: number | null = null;

  // YYYY-MM or YYYY/MM
  let m = compact.match(/^(\d{4})[/-](\d{1,2})$/);
  if (m) {
    year = Number(m[1]);
    month = Number(m[2]);
  }

  // MM-YYYY or MM/YYYY
  if (!year || !month) {
    m = compact.match(/^(\d{1,2})[/-](\d{4})$/);
    if (m) {
      month = Number(m[1]);
      year = Number(m[2]);
    }
  }

  // Hebrew/English month name + year (e.g. "מרץ 2026", "March 2026")
  if (!year || !month) {
    m = compact.match(/^([^\d]+)\s+(\d{4})$/);
    if (m) {
      const rawMonthName = norm(m[1]).toLowerCase();
      year = Number(m[2]);
      month = hebrewMonths[rawMonthName] ?? englishMonths[rawMonthName] ?? null;
    }
  }

  if (!year || !month || month < 1 || month > 12 || year < 1980 || year > 2100) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function utcDayKey(d: Date): string {
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
  if (["clinic", "קליניקה", "טיפול בקליניקה"].includes(t)) return "clinic";
  if (["home", "בית", "ביקור בית", "טיפול בבית", "ביתי"].includes(t)) return "home";
  if (["phone", "טלפון", "ייעוץ טלפוני", "טלפוני", "טיפול טלפוני"].includes(t)) return "phone";
  if (["video", "וידאו", "מקוון (וידאו)", "מקוון", "זום", "טיפול בזום"].includes(t)) return "video";
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
  const lower = text.toLowerCase();
  if (!text) return { receiptMethod: null, treatmentMethod: null, accountDigits: null, digitalHint: null };

  // English (receipt import) + common labels
  if (lower === "cash" || text === "מזומן") {
    return { receiptMethod: "cash", treatmentMethod: null, accountDigits: null, digitalHint: null };
  }
  if (
    (lower.includes("credit") && lower.includes("card")) ||
    lower.includes("אשראי") ||
    lower === "cc"
  ) {
    return { receiptMethod: "credit_card", treatmentMethod: null, accountDigits: null, digitalHint: null };
  }
  if (
    lower.includes("bank") ||
    lower.includes("transfer") ||
    lower.includes("wire") ||
    text.includes("העברה")
  ) {
    const digitRuns = text.match(/\d+/g) ?? [];
    const longest = digitRuns.sort((a, b) => b.length - a.length)[0] ?? null;
    return {
      receiptMethod: "bank_transfer",
      treatmentMethod: "bank_transfer",
      accountDigits: longest,
      digitalHint: null,
    };
  }
  if (
    text.includes("ביט") ||
    lower.includes("bit") ||
    lower.includes("digital") ||
    lower.includes("paybox") ||
    lower.includes("paypal") ||
    lower.includes("apple pay") ||
    lower.includes("google pay")
  ) {
    const hint =
      text.includes("ביט") || lower.includes("bit")
        ? "ביט"
        : lower.includes("paybox")
          ? "paybox"
          : lower.includes("paypal")
            ? "paypal"
            : "digital";
    return {
      receiptMethod: "digital_card",
      treatmentMethod: "digital_payment",
      accountDigits: null,
      digitalHint: hint,
    };
  }

  return { receiptMethod: null, treatmentMethod: null, accountDigits: null, digitalHint: null };
}

type BankDigitalImportCtx = {
  isPrivateClinic: boolean;
  jobFamilyMemberId: string | null;
  bankAccounts: Array<{ id: string; account_number: string | null }>;
  digitalMethods: Array<{ id: string; name: string; method_type: string; family_member_id: string | null }>;
};

function expectedDigitalMethodTypeFromHint(hintRaw: string | null): string | null {
  const hint = (hintRaw ?? "").toLowerCase().trim();
  if (!hint) return null;
  if (hint.includes("ביט") || hint.includes("bit")) return "bit";
  if (hint.includes("paybox")) return "paybox";
  if (hint.includes("paypal")) return "paypal";
  return null;
}

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
    } else if (!ctx.isPrivateClinic) {
      scratch.errors.push(`Row ${rowNumber}: bank transfer must include account digits.`);
      return { ok: false, bankId, digitalId };
    }
  }
  if (payment.treatmentMethod === "digital_payment") {
    const hint = payment.digitalHint?.toLowerCase() ?? "";
    const expectedType = expectedDigitalMethodTypeFromHint(payment.digitalHint);
    const byType = expectedType ? ctx.digitalMethods.filter((m) => m.method_type === expectedType) : [];
    const matches =
      byType.length > 0
        ? byType
        : ctx.digitalMethods.filter((m) => m.name.toLowerCase().includes(hint));
    const ownerScopedMatches = ctx.jobFamilyMemberId
      ? matches.filter((m) => m.family_member_id === ctx.jobFamilyMemberId)
      : [];
    const householdFallbackMatches =
      ownerScopedMatches.length > 0
        ? ownerScopedMatches
        : matches.filter((m) => m.family_member_id == null);
    const preferredMatches = ownerScopedMatches.length > 0 ? ownerScopedMatches : householdFallbackMatches;
    if (preferredMatches.length === 1) {
      digitalId = preferredMatches[0]!.id;
    } else if (ctx.isPrivateClinic) {
      scratch.warnings.push(
        `Row ${rowNumber}: could not uniquely match digital payment method ${paymentRouteLabel || "(digital)"}; saved without linking a digital method.`,
      );
    } else {
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
  orgPaymentDiagnostics: Array<{
    rowNumber: number;
    receiptNumber: string;
    coveredMonthRaw: string;
    coveredMonthKey: string | null;
    fallbackIssuedMonthKey: string;
    monthKeyUsed: string;
    matchedTreatments: number;
    matchedConsultations?: number;
    matchedTravel?: number;
    matchedTreatmentsAmount?: string;
    matchedConsultationsAmount?: string;
    matchedTravelAmount?: string;
  }>;
  travelLinkDiagnostics: Array<{
    rowNumber: number;
    client: string;
    date: string;
    linkedToTreatment: boolean;
    source: "pending_import" | "existing_db" | "none";
  }>;
};

async function buildTravelLinkDiagnostics(
  params: { householdId: string; jobId: string },
  scratch: AnalyzeScratch,
): Promise<AnalyzeScratch["travelLinkDiagnostics"]> {
  const diagnostics: AnalyzeScratch["travelLinkDiagnostics"] = [];
  const existingClientIds = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  for (const tr of scratch.pendingTravel) {
    if (!tr.clientRef || !tr.occurredAt) continue;
    if (tr.clientRef.kind === "existing") {
      existingClientIds.add(tr.clientRef.id);
      if (!minDate || tr.occurredAt < minDate) minDate = tr.occurredAt;
      if (!maxDate || tr.occurredAt > maxDate) maxDate = tr.occurredAt;
    }
  }

  const existingByClientDay = new Set<string>();
  if (existingClientIds.size > 0 && minDate && maxDate) {
    const dbRows = await prisma.therapy_treatments.findMany({
      where: {
        household_id: params.householdId,
        job_id: params.jobId,
        client_id: { in: [...existingClientIds] },
        occurred_at: {
          gte: new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate(), 0, 0, 0)),
          lte: new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate(), 23, 59, 59, 999)),
        },
      },
      select: { client_id: true, occurred_at: true },
    });
    for (const row of dbRows) {
      existingByClientDay.add(`${row.client_id}|${utcDayKey(row.occurred_at)}`);
    }
  }

  const pendingByDisplayDay = new Set<string>();
  for (const treatment of scratch.pendingTreatments.values()) {
    pendingByDisplayDay.add(`${treatment.clientRef.displayName}|${utcDayKey(treatment.occurredAt)}`);
  }

  for (const tr of scratch.pendingTravel) {
    if (!tr.clientRef || !tr.occurredAt) continue;
    const date = utcDayKey(tr.occurredAt);
    let source: "pending_import" | "existing_db" | "none" = "none";
    if (pendingByDisplayDay.has(`${tr.clientRef.displayName}|${date}`)) {
      source = "pending_import";
    } else if (tr.clientRef.kind === "existing" && existingByClientDay.has(`${tr.clientRef.id}|${date}`)) {
      source = "existing_db";
    }
    diagnostics.push({
      rowNumber: tr.rowNumber,
      client: tr.clientRef.displayName,
      date,
      linkedToTreatment: source !== "none",
      source,
    });
  }
  return diagnostics;
}

function appendTravelLinkWarnings(scratch: AnalyzeScratch): void {
  if (scratch.travelLinkDiagnostics.length === 0) return;
  let shown = 0;
  for (const item of scratch.travelLinkDiagnostics) {
    if (shown >= 30) break;
    scratch.warnings.push(
      item.linkedToTreatment
        ? `Row ${item.rowNumber}: travel for ${item.client} on ${item.date} linked to a treatment (${item.source === "pending_import" ? "from file" : "from database"}).`
        : `Row ${item.rowNumber}: travel for ${item.client} on ${item.date} is not linked to a treatment.`,
    );
    shown += 1;
  }
  if (scratch.travelLinkDiagnostics.length > shown) {
    scratch.warnings.push(
      `Travel linkage diagnostics truncated: showing ${shown} of ${scratch.travelLinkDiagnostics.length} client-linked travel rows.`,
    );
  }
}

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

function uniqueTreatmentKey(
  pendingTreatments: Map<string, PendingTreatment>,
  baseKey: string,
  rowNumber: number,
): string {
  if (!pendingTreatments.has(baseKey)) return baseKey;
  return `${baseKey}|row:${rowNumber}`;
}

/** English receipt-import columns; tolerates minor header variations. */
function receiptImportCell(row: Row, header: string): unknown {
  if (Object.prototype.hasOwnProperty.call(row, header)) {
    const v = row[header];
    if (v !== undefined && String(v ?? "").trim() !== "") return v;
  }
  const target = norm(header).toLowerCase();
  for (const k of Object.keys(row)) {
    if (norm(String(k)).toLowerCase() === target) return row[k];
  }
  const compact = target.replace(/\s+/g, "");
  const aliasMap: Record<string, string[]> = {
    paymentdate: ["payment date"],
    client: ["client"],
    amount: ["amount"],
    "receipt#": ["receipt #", "receiptno", "receiptnumber", "receipt no", "receipt no."],
    notes: ["notes", "note"],
    paymentmethod: ["payment method", "method"],
  };
  const keys = aliasMap[compact];
  if (keys) {
    for (const k of Object.keys(row)) {
      const kn = norm(String(k)).toLowerCase().replace(/\s+/g, "");
      if (keys.some((a) => a.replace(/\s+/g, "") === kn)) return row[k];
    }
  }
  return null;
}

async function analyzeReceiptOnlyProfile(
  params: TipulimAnalyzeParams,
  ctx: {
    isPrivateClinic: boolean;
    jobFamilyMemberId: string | null;
    jobEmploymentType: "freelancer" | "employee" | "self_employed" | "contractor_via_company" | null;
    clients: ClientCandidate[];
    programsByJob: Array<{ id: string; name: string; job_id: string }>;
    bankAccounts: Array<{ id: string; account_number: string | null }>;
    digitalMethods: Array<{ id: string; name: string; method_type: string; family_member_id: string | null }>;
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
    orgPaymentDiagnostics: [],
    travelLinkDiagnostics: [],
  };
  const defaultReceiptKind = defaultReceiptKindForJobEmploymentType(ctx.jobEmploymentType);

  const usualParsed = parseMoney(String(params.usualTreatmentCost ?? "").trim());
  if (!usualParsed) {
    scratch.errors.push("Missing usual treatment cost. Enter the typical session fee used for this import.");
    return scratch;
  }
  const usualNum = Number(usualParsed);
  const threshold = usualNum * 1.1;
  const datePreference = params.dateFormatPreference ?? "auto";

  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx]!;
    const rowNumber = idx + 2;
    const paymentDateCell = receiptImportCell(row, "Payment Date");
    const clientRaw = s(receiptImportCell(row, "Client"));
    const amountRaw = s(receiptImportCell(row, "Amount"));
    const receiptNum = s(receiptImportCell(row, "Receipt #"));
    const noteRaw = s(receiptImportCell(row, "Notes")) || null;
    const payRoute = s(receiptImportCell(row, "Payment method"));

    if (!clientRaw || !amountRaw || !receiptNum) {
      scratch.errors.push(
        `Row ${rowNumber}: missing required column (Client, Amount, and Receipt # are required).`,
      );
      continue;
    }

    const amount = parseMoney(amountRaw);
    if (!amount) {
      scratch.errors.push(`Row ${rowNumber}: invalid Amount.`);
      continue;
    }

    const parsedPaymentDate = parseReceiptDateCell(paymentDateCell, datePreference);
    if (parsedPaymentDate.ambiguous) {
      scratch.errors.push(
        `Row ${rowNumber}: ambiguous Payment Date "${String(paymentDateCell)}". Use YYYY-MM-DD or choose a date format.`,
      );
      continue;
    }
    const issuedAt = parsedPaymentDate.date;
    if (!issuedAt) {
      scratch.errors.push(`Row ${rowNumber}: invalid Payment Date.`);
      continue;
    }

    const clientRef = await resolveClientRef(
      clientRaw,
      rowNumber,
      ctx.clients,
      scratch.newClients,
      scratch.conflicts,
      params.clientResolutions,
    );
    if (!clientRef) continue;

    const payment = paymentMethodFromText(payRoute);
    if (!payment.receiptMethod) {
      scratch.errors.push(`Row ${rowNumber}: missing or unknown Payment method "${payRoute}".`);
      continue;
    }

    let bankId: string | null = null;
    let digitalId: string | null = null;
    if (payment.treatmentMethod) {
      const resolvedIds = resolveBankDigitalForParsedPayment(ctx, payment, rowNumber, scratch, payRoute);
      if (!resolvedIds.ok) continue;
      bankId = resolvedIds.bankId;
      digitalId = resolvedIds.digitalId;
    }

    const amtNum = Number(amount);

    const treatmentDateEntries = collectReceiptTreatmentDateColumnEntries(row);
    const treatmentTimeEntries = new Map(
      collectReceiptTreatmentTimeColumnEntries(row).map((entry) => [entry.order, entry]),
    );
    const rowLevelTreatmentTime = treatmentTimeCell(row);
    const treatmentOccurredAt: Date[] = [];
    let treatmentDatesInvalid = false;
    for (const { label, cell } of treatmentDateEntries) {
      const orderMatch = label.match(/(\d+)$/);
      const order = orderMatch ? Number(orderMatch[1]) : null;
      const timeEntry = order ? treatmentTimeEntries.get(order) : undefined;
      const baseParsed = parseReceiptDateCell(cell, datePreference);
      const timeForCell = timeEntry?.cell ?? rowLevelTreatmentTime;
      const merged = baseParsed.date ? parseDateFromCell(baseParsed.date, timeForCell) : null;
      const parsedTreatmentDate = { date: merged, ambiguous: baseParsed.ambiguous };
      if (parsedTreatmentDate.ambiguous) {
        scratch.errors.push(
          `Row ${rowNumber}: ambiguous ${label} "${String(cell)}". Use YYYY-MM-DD or choose a date format.`,
        );
        treatmentDatesInvalid = true;
        break;
      }
      const od = parsedTreatmentDate.date;
      if (!od) {
        const timeLabel = timeEntry?.label ? ` + ${timeEntry.label}` : "";
        scratch.errors.push(`Row ${rowNumber}: invalid ${label}${timeLabel}.`);
        treatmentDatesInvalid = true;
        break;
      }
      treatmentOccurredAt.push(od);
    }
    if (treatmentDatesInvalid) continue;

    const sessionCount = treatmentOccurredAt.length > 0 ? treatmentOccurredAt.length : 1;
    const amountParts: string[] | null =
      sessionCount === 1 ? [amount] : splitMoneyEqualParts(amount, sessionCount);
    if (!amountParts || amountParts.length !== sessionCount) {
      scratch.errors.push(`Row ${rowNumber}: could not split Amount across treatment dates.`);
      continue;
    }

    const perPartWithinSessionCap = (parts: string[]) =>
      parts.every((p) => Number(p) <= threshold + 0.005);

    let createTreatments = false;
    let omitTreatmentAmountsAndAllocations = false;
    if (sessionCount > 1) {
      createTreatments = true;
      omitTreatmentAmountsAndAllocations = !perPartWithinSessionCap(amountParts);
    } else {
      createTreatments = amtNum <= threshold + 0.005;
    }

    if (createTreatments) {
      let vt = params.missingVisitType ?? null;
      if (!vt) {
        scratch.errors.push(
          `Row ${rowNumber}: auto-creating a treatment requires a fallback visit type. Choose one above and analyze again.`,
        );
        continue;
      }
      for (let c = 0; c < sessionCount; c += 1) {
        addTreatmentCount(scratch.treatmentCountsByDisplay, clientRef.displayName);
      }
      const display = clientRef.displayName;

      const allocations: PendingAllocation[] = [];
      for (let i = 0; i < sessionCount; i += 1) {
        const occurredAt = treatmentOccurredAt[i] ?? parseDateFromCell(issuedAt, rowLevelTreatmentTime) ?? issuedAt;
        const partAmount: string | null = omitTreatmentAmountsAndAllocations ? null : amountParts[i]!;
        const amountKeyPart = partAmount ?? "unset";
        const baseKey = `${display}|${monthKey(occurredAt)}|${amountKeyPart}|${vt}|receipt:${receiptNum}|n:${i}`;
        const tKey = uniqueTreatmentKey(scratch.pendingTreatments, baseKey, rowNumber);
        scratch.pendingTreatments.set(tKey, {
          key: tKey,
          rowNumber,
          clientRef,
          programName: null,
          occurredAt,
          amount: partAmount,
          visitType: vt,
          note: noteRaw,
          paymentDate: issuedAt,
          paymentMethod: payment.treatmentMethod,
          paymentBankAccountId: bankId,
          paymentDigitalMethodId: digitalId,
        });
        if (!omitTreatmentAmountsAndAllocations) {
          allocations.push({ amount: amountParts[i]!, treatmentKey: tKey });
        }
      }

      if (omitTreatmentAmountsAndAllocations) {
        scratch.warnings.push(
          `Row ${rowNumber}: receipt #${receiptNum} split across ${sessionCount} treatment dates yields a share above ${(threshold + 0.005).toFixed(2)} (usual fee +10% per session). Treatments are created with session amount unset and the receipt is not allocated to them — set amounts and allocations manually if needed.`,
        );
      }

      scratch.pendingReceipts.push({
        key: `receipt:${receiptNum}|row:${rowNumber}`,
        rowNumber,
        receiptNumber: receiptNum,
        issuedAt,
        totalAmount: amount,
        netAmount: amount,
        receiptKind: defaultReceiptKind,
        notes: noteRaw,
        paymentMethod: payment.receiptMethod,
        recipientType: ctx.isPrivateClinic ? "client" : "organization",
        coveredPeriodStart: null,
        coveredPeriodEnd: null,
        allocations,
        consultationAllocations: [],
        travelAllocations: [],
        omitTreatmentAmountsAndAllocations,
      });
    } else {
      scratch.pendingReceipts.push({
        key: `receipt:${receiptNum}|row:${rowNumber}`,
        rowNumber,
        receiptNumber: receiptNum,
        issuedAt,
        totalAmount: amount,
        netAmount: amount,
        receiptKind: defaultReceiptKind,
        notes: noteRaw,
        paymentMethod: payment.receiptMethod,
        recipientType: ctx.isPrivateClinic ? "client" : "organization",
        coveredPeriodStart: null,
        coveredPeriodEnd: null,
        allocations: [],
        consultationAllocations: [],
        travelAllocations: [],
        explicitClientRefForReceipt: clientRef,
      });
      scratch.warnings.push(
        `Row ${rowNumber}: receipt #${receiptNum} amount ${amount} is above ${(threshold + 0.005).toFixed(2)} (usual fee +10%). Import the receipt only — create treatments manually.`,
      );
    }
  }

  scratch.travelLinkDiagnostics = await buildTravelLinkDiagnostics(
    { householdId: params.householdId, jobId: params.jobId },
    scratch,
  );
  appendTravelLinkWarnings(scratch);
  return scratch;
}

export async function analyzeReceiptOnlyProfileForTest(
  params: TipulimAnalyzeParams,
  ctx: {
    isPrivateClinic: boolean;
    jobFamilyMemberId: string | null;
    jobEmploymentType: "freelancer" | "employee" | "self_employed" | "contractor_via_company" | null;
    clients: ClientCandidate[];
    programsByJob: Array<{ id: string; name: string; job_id: string }>;
    bankAccounts: Array<{ id: string; account_number: string | null }>;
    digitalMethods: Array<{ id: string; name: string; method_type: string; family_member_id: string | null }>;
  },
) {
  return analyzeReceiptOnlyProfile(params, ctx);
}

async function analyzePrivateProfile(
  params: TipulimAnalyzeParams,
  ctx: {
    isPrivateClinic: boolean;
    jobFamilyMemberId: string | null;
    jobEmploymentType: "freelancer" | "employee" | "self_employed" | "contractor_via_company" | null;
    clients: ClientCandidate[];
    programsByJob: Array<{ id: string; name: string; job_id: string }>;
    bankAccounts: Array<{ id: string; account_number: string | null }>;
    digitalMethods: Array<{ id: string; name: string; method_type: string; family_member_id: string | null }>;
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
    orgPaymentDiagnostics: [],
    travelLinkDiagnostics: [],
  };
  const pendingAllocByReceipt = new Map<string, PendingAllocation[]>();
  const defaultReceiptKind = defaultReceiptKindForJobEmploymentType(ctx.jobEmploymentType);
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

    const occurredAt = parseDateFromCell(dateCell, treatmentTimeCell(row));
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
      const baseKey = `${display}|${monthKey(occurredAt)}|${amount}|${vt}`;
      const tKey = uniqueTreatmentKey(scratch.pendingTreatments, baseKey, rowNumber);
      scratch.pendingTreatments.set(tKey, {
        key: tKey,
        rowNumber,
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
      const receiptKeys = receiptMatchKeys(row["קבלה"]);
      if (receiptKeys.length > 0) {
        for (const rk of receiptKeys) {
          const arr = pendingAllocByReceipt.get(rk) ?? [];
          arr.push({ amount, treatmentKey: tKey });
          pendingAllocByReceipt.set(rk, arr);
        }
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

    const allocationKeys = receiptMatchKeys(row["קבלה"]);
    const allocationsSeen = new Set<string>();
    const allocations: PendingAllocation[] = [];
    for (const k of allocationKeys) {
      const arr = pendingAllocByReceipt.get(k) ?? [];
      for (const a of arr) {
        const uniq = `${a.treatmentKey}|${a.amount}`;
        if (allocationsSeen.has(uniq)) continue;
        allocationsSeen.add(uniq);
        allocations.push(a);
      }
    }
    if (allocations.length === 0) {
      const issueDay = utcDayKey(issuedAt);
      const inferred = Array.from(scratch.pendingTreatments.values())
        .filter((t) => t.paymentDate && utcDayKey(t.paymentDate) === issueDay && t.amount != null)
        .sort((a, b) => a.rowNumber - b.rowNumber)
        .map((t) => ({ amount: t.amount!, treatmentKey: t.key }));
      if (inferred.length > 0) {
        const inferredSum = inferred.reduce((sum, a) => sum + Number(a.amount), 0);
        if (Math.abs(inferredSum - Number(totalAmount)) <= 0.01) {
          allocations.push(...inferred);
        }
      }
    }
    if (allocations.length === 0) {
      scratch.errors.push(`Row ${rowNumber}: receipt #${receiptNum} could not be linked to any treatments.`);
      continue;
    }
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
      netAmount: totalAmount,
      receiptKind: defaultReceiptKind,
      notes: noteRaw,
      paymentMethod: payment.receiptMethod,
      recipientType: ctx.isPrivateClinic ? "client" : "organization",
      coveredPeriodStart: null,
      coveredPeriodEnd: null,
      allocations: allocations.map((a) => ({
        amount: a.amount,
        treatmentKey: a.treatmentKey,
      })),
      consultationAllocations: [],
      travelAllocations: [],
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
  scratch.travelLinkDiagnostics = await buildTravelLinkDiagnostics(
    { householdId: params.householdId, jobId: params.jobId },
    scratch,
  );
  appendTravelLinkWarnings(scratch);
  return scratch;
}

export async function analyzePrivateProfileForTest(
  params: TipulimAnalyzeParams,
  ctx: {
    isPrivateClinic: boolean;
    jobFamilyMemberId: string | null;
    jobEmploymentType: "freelancer" | "employee" | "self_employed" | "contractor_via_company" | null;
    clients: ClientCandidate[];
    programsByJob: Array<{ id: string; name: string; job_id: string }>;
    bankAccounts: Array<{ id: string; account_number: string | null }>;
    digitalMethods: Array<{ id: string; name: string; method_type: string; family_member_id: string | null }>;
  },
) {
  return analyzePrivateProfile(params, ctx);
}

async function analyzeOrgProfile(params: TipulimAnalyzeParams, ctx: {
  isPrivateClinic: boolean;
  jobFamilyMemberId: string | null;
  jobEmploymentType: "freelancer" | "employee" | "self_employed" | "contractor_via_company" | null;
  clients: ClientCandidate[];
  programsByJob: Array<{ id: string; name: string; job_id: string }>;
  bankAccounts: Array<{ id: string; account_number: string | null }>;
  digitalMethods: Array<{ id: string; name: string; method_type: string; family_member_id: string | null }>;
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
    orgPaymentDiagnostics: [],
    travelLinkDiagnostics: [],
  };
  const existingProgramNames = new Set(
    ctx.programsByJob.filter((p) => p.job_id === params.jobId).map((p) => norm(p.name)),
  );
  const jobProgramsForOrg = ctx.programsByJob.filter((p) => p.job_id === params.jobId);
  const soleProgramNameNorm =
    jobProgramsForOrg.length === 1 ? norm(jobProgramsForOrg[0]!.name) : null;
  let soleProgramDefaultWarningAdded = false;
  const treatmentKeysByMonth = new Map<string, string[]>();
  const consultationKeysByMonth = new Map<string, string[]>();
  const travelKeysByMonth = new Map<string, string[]>();
  const pendingOrgPaymentRows: PendingOrgPaymentRow[] = [];
  const defaultReceiptKind = defaultReceiptKindForJobEmploymentType(ctx.jobEmploymentType);
  for (let idx = 0; idx < rows.length; idx += 1) {
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
      if (!d || !total || !receiptNum) {
        scratch.errors.push(`Row ${rowNumber}: monthly payment row is missing required receipt fields.`);
        continue;
      }
      pendingOrgPaymentRows.push({
        rowNumber,
        receiptNum,
        total,
        issuedAt: d,
        payRoute,
        note: s(row["הערות"]) || null,
        coveredMonthRaw: s(dateCell),
      });
      continue;
    }
    const hasOrgDate =
      (dateRaw && dateRaw.length > 0) || dateCell instanceof Date || typeof dateCell === "number";
    if (!amount || !hasOrgDate) continue;
    const occurredAt = parseDateFromCell(dateCell, treatmentTimeCell(row));
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
    let vt = visitTypeFromCell(v);
    if (vt || !v) {
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
      const effectiveProgramName = programName || soleProgramNameNorm || null;
      if (!programName && soleProgramNameNorm && !soleProgramDefaultWarningAdded) {
        scratch.warnings.push(
          `Empty program column: using the only program defined for this job (${soleProgramNameNorm}).`,
        );
        soleProgramDefaultWarningAdded = true;
      }
      const baseKey = `${clientRef.displayName}|${monthKey(occurredAt)}|${amount}|${vt}`;
      const key = uniqueTreatmentKey(scratch.pendingTreatments, baseKey, rowNumber);
      scratch.pendingTreatments.set(key, {
        key,
        rowNumber,
        clientRef,
        programName: effectiveProgramName,
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
        // Prefer same-row direct key match when available; if it misses, we fall back later
        // to same-client + same-date treatment linkage.
        linkedTreatmentKey = `${clientRef.displayName}|${monthKey(occurredAt)}|${amount}|home`;
      }
      const travelKey = `travel:${rowNumber}`;
      scratch.pendingTravel.push({
        key: travelKey,
        rowNumber,
        occurredAt,
        amount,
        note: s(row["הערות"]) || null,
        clientRef,
        treatmentKey: linkedTreatmentKey,
      });
      const month = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const travelArr = travelKeysByMonth.get(month) ?? [];
      travelArr.push(travelKey);
      travelKeysByMonth.set(month, travelArr);
      scratch.routing.travel += 1;
      continue;
    }
    const consultLike = new Set(["התייעצות", "ישיבת צוות", "הדרכה", "פגישה", "אירוע", "בונוס", "חבר מביא חבר"]);
    if (consultLike.has(v)) {
      const consultationKey = `consultation:${rowNumber}`;
      scratch.pendingConsultations.push({
        key: consultationKey,
        occurredAt,
        amount,
        note: s(row["הערות"]) || null,
        typeName: v || "other",
        clientRef,
      });
      const month = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const consultArr = consultationKeysByMonth.get(month) ?? [];
      consultArr.push(consultationKey);
      consultationKeysByMonth.set(month, consultArr);
      scratch.routing.consultations += 1;
      continue;
    }
    if (!v) {
      if (params.missingVisitType) {
        const fallbackKeyBase = `${clientRef?.displayName ?? "unknown"}|${monthKey(occurredAt)}|${amount}|${params.missingVisitType}`;
        const fallbackKey = uniqueTreatmentKey(scratch.pendingTreatments, fallbackKeyBase, rowNumber);
        if (!clientRef) continue;
        const effectiveProgramName = programName || soleProgramNameNorm || null;
        if (!programName && soleProgramNameNorm && !soleProgramDefaultWarningAdded) {
          scratch.warnings.push(
            `Empty program column: using the only program defined for this job (${soleProgramNameNorm}).`,
          );
          soleProgramDefaultWarningAdded = true;
        }
        scratch.pendingTreatments.set(fallbackKey, {
          key: fallbackKey,
          rowNumber,
          clientRef,
          programName: effectiveProgramName,
          occurredAt,
          amount,
          visitType: params.missingVisitType,
          note: s(row["הערות"]) || null,
          paymentDate: null,
          paymentMethod: null,
          paymentBankAccountId: null,
          paymentDigitalMethodId: null,
        });
        addTreatmentCount(scratch.treatmentCountsByDisplay, clientRef.displayName);
        const month = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
        const arr = treatmentKeysByMonth.get(month) ?? [];
        arr.push(fallbackKey);
        treatmentKeysByMonth.set(month, arr);
        const ap = scratch.autoPrograms.get(programName);
        if (ap) ap.treatmentCount += 1;
      } else {
        scratch.errors.push(
          `Row ${rowNumber}: missing visit type. Choose a fallback visit type in the import dialog and analyze again.`,
        );
      }
    } else {
      scratch.errors.push(`Row ${rowNumber}: unsupported visit type "${visitType}".`);
    }
  }

  // Pass 2 for org monthly payment rows: resolve links after all treatments are known.
  for (const payRow of pendingOrgPaymentRows) {
    const payment = paymentMethodFromText(payRow.payRoute);
    if (!payment.receiptMethod) {
      scratch.errors.push(`Row ${payRow.rowNumber}: missing or unknown payment route for receipt #${payRow.receiptNum}.`);
      continue;
    }
    const resolvedIds = resolveBankDigitalForParsedPayment(
      ctx,
      payment,
      payRow.rowNumber,
      scratch,
      payRow.payRoute,
    );
    if (!resolvedIds.ok) continue;

    const coveredMonth = parseCoveredMonth(payRow.coveredMonthRaw);
    const coveredMonthKey = coveredMonth
      ? `${coveredMonth.start.getUTCFullYear()}-${String(coveredMonth.start.getUTCMonth() + 1).padStart(2, "0")}`
      : null;
    const fallbackIssuedMonthKey = `${payRow.issuedAt.getUTCFullYear()}-${String(payRow.issuedAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthKeyUsed = coveredMonthKey ?? fallbackIssuedMonthKey;
    const treatmentKeys = treatmentKeysByMonth.get(monthKeyUsed) ?? [];
    const consultationKeys = consultationKeysByMonth.get(monthKeyUsed) ?? [];
    const travelKeys = travelKeysByMonth.get(monthKeyUsed) ?? [];
    scratch.orgPaymentDiagnostics.push({
      rowNumber: payRow.rowNumber,
      receiptNumber: payRow.receiptNum,
      coveredMonthRaw: payRow.coveredMonthRaw,
      coveredMonthKey,
      fallbackIssuedMonthKey,
      monthKeyUsed,
      matchedTreatments: treatmentKeys.length,
      matchedConsultations: consultationKeys.length,
      matchedTravel: travelKeys.length,
    });
    const allocationsSeen = new Set<string>();
    const allocations: PendingAllocation[] = [];
    for (const tKey of treatmentKeys) {
      const treatment = scratch.pendingTreatments.get(tKey);
      if (!treatment || treatment.amount == null) continue;
      const uniq = `${tKey}|${treatment.amount}`;
      if (allocationsSeen.has(uniq)) continue;
      allocationsSeen.add(uniq);
      allocations.push({ treatmentKey: tKey, amount: treatment.amount });
    }
    const consultationAllocations: PendingConsultationAllocation[] = [];
    for (const cKey of consultationKeys) {
      const consultation = scratch.pendingConsultations.find((c) => c.key === cKey);
      if (!consultation) continue;
      consultationAllocations.push({ consultationKey: cKey, amount: consultation.amount });
    }
    const travelAllocations: PendingTravelAllocation[] = [];
    for (const trKey of travelKeys) {
      const travel = scratch.pendingTravel.find((t) => t.key === trKey);
      if (!travel?.amount) continue;
      travelAllocations.push({ travelKey: trKey, amount: travel.amount });
    }
    const treatmentAmountSum = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
    const consultationAmountSum = consultationAllocations.reduce((sum, a) => sum + Number(a.amount), 0);
    const travelAmountSum = travelAllocations.reduce((sum, a) => sum + Number(a.amount), 0);
    const lastDiag = scratch.orgPaymentDiagnostics[scratch.orgPaymentDiagnostics.length - 1];
    if (lastDiag && lastDiag.rowNumber === payRow.rowNumber && lastDiag.receiptNumber === payRow.receiptNum) {
      lastDiag.matchedTreatmentsAmount = treatmentAmountSum.toFixed(2);
      lastDiag.matchedConsultationsAmount = consultationAmountSum.toFixed(2);
      lastDiag.matchedTravelAmount = travelAmountSum.toFixed(2);
    }
    const allocationsSum =
      treatmentAmountSum + consultationAmountSum + travelAmountSum;
    if (
      allocations.length === 0 &&
      consultationAllocations.length === 0 &&
      travelAllocations.length === 0
    ) {
      scratch.errors.push(
        `Row ${payRow.rowNumber}: receipt #${payRow.receiptNum} could not be linked to any treatments.`,
      );
      continue;
    }
    if (allocationsSum > 0 && Math.abs(allocationsSum - Number(payRow.total)) > 0.01) {
      const remainder = Number(payRow.total) - allocationsSum;
      scratch.warnings.push(
        `Row ${payRow.rowNumber}: monthly payment receipt #${payRow.receiptNum} total ${payRow.total} differs from linked entries ${allocationsSum.toFixed(2)} (remainder ${remainder.toFixed(2)}).`,
      );
    }
    scratch.pendingReceipts.push({
      key: `org:${payRow.receiptNum}`,
      rowNumber: payRow.rowNumber,
      receiptNumber: payRow.receiptNum,
      issuedAt: payRow.issuedAt,
      totalAmount: payRow.total,
      netAmount: payRow.total,
      receiptKind: defaultReceiptKind,
      notes: payRow.note,
      paymentMethod: payment.receiptMethod,
      recipientType: "organization",
      coveredPeriodStart:
        coveredMonth?.start ??
        new Date(Date.UTC(payRow.issuedAt.getUTCFullYear(), payRow.issuedAt.getUTCMonth(), 1)),
      coveredPeriodEnd:
        coveredMonth?.end ??
        new Date(Date.UTC(payRow.issuedAt.getUTCFullYear(), payRow.issuedAt.getUTCMonth() + 1, 0)),
      allocations,
      consultationAllocations,
      travelAllocations,
      treatmentKeysToMarkPaid: treatmentKeys,
      treatmentPaymentMethod: payment.treatmentMethod,
      treatmentBankAccountId: resolvedIds.bankId,
      treatmentDigitalMethodId: resolvedIds.digitalId,
    });
  }
  scratch.travelLinkDiagnostics = await buildTravelLinkDiagnostics(
    { householdId: params.householdId, jobId: params.jobId },
    scratch,
  );
  appendTravelLinkWarnings(scratch);
  return scratch;
}

export async function analyzeOrgProfileForTest(params: TipulimAnalyzeParams, ctx: {
  isPrivateClinic: boolean;
  jobFamilyMemberId: string | null;
  jobEmploymentType: "freelancer" | "employee" | "self_employed" | "contractor_via_company" | null;
  clients: ClientCandidate[];
  programsByJob: Array<{ id: string; name: string; job_id: string }>;
  bankAccounts: Array<{ id: string; account_number: string | null }>;
  digitalMethods: Array<{ id: string; name: string; method_type: string; family_member_id: string | null }>;
}) {
  return analyzeOrgProfile(params, ctx);
}

function makeSummary(scratch: AnalyzeScratch): TipulimAnalyzeResult {
  const visitCountsByClient = new Map<string, Map<"clinic" | "home" | "phone" | "video", number>>();
  for (const treatment of scratch.pendingTreatments.values()) {
    const displayName = treatment.clientRef.displayName;
    const visitCounts = visitCountsByClient.get(displayName) ?? new Map();
    visitCounts.set(treatment.visitType, (visitCounts.get(treatment.visitType) ?? 0) + 1);
    visitCountsByClient.set(displayName, visitCounts);
  }
  const visitPriority: Array<"clinic" | "home" | "phone" | "video"> = ["clinic", "home", "phone", "video"];
  const treatmentsPerClient = Array.from(scratch.treatmentCountsByDisplay.entries()).map(([displayName, count]) => {
    const visitCounts = visitCountsByClient.get(displayName) ?? new Map();
    let majorityVisitType: "clinic" | "home" | "phone" | "video" | null = null;
    let maxCount = 0;
    for (const vt of visitPriority) {
      const vtCount = visitCounts.get(vt) ?? 0;
      if (vtCount > maxCount) {
        maxCount = vtCount;
        majorityVisitType = vt;
      }
    }
    return { displayName, clientId: null, count, majorityVisitType };
  });
  const receiptsNeedingManualTreatmentCount = scratch.pendingReceipts.filter(
    (r) => r.explicitClientRefForReceipt && r.allocations.length === 0,
  ).length;

  return {
    newClientsCount: scratch.newClients.size,
    treatmentsTotal: Array.from(scratch.treatmentCountsByDisplay.values()).reduce((a, b) => a + b, 0),
    treatmentsPerClient,
    receiptsToCreateCount: scratch.pendingReceipts.length,
    receiptsNeedingManualTreatmentCount,
    programsToAutoCreate: Array.from(scratch.autoPrograms.values()),
    warnings: scratch.warnings,
    blockingErrors: scratch.errors,
    clientConflicts: scratch.conflicts,
    routing:
      scratch.routing.travel || scratch.routing.consultations
        ? { travelEntriesCount: scratch.routing.travel, consultationEntriesCount: scratch.routing.consultations }
        : undefined,
    importDebug: {
      unlinkedReceiptsCount: scratch.pendingReceipts.filter((r) => {
        const treatment = r.allocations.length;
        const consultations = r.consultationAllocations?.length ?? 0;
        const travel = r.travelAllocations?.length ?? 0;
        const manualReceiptOnly = Boolean(r.explicitClientRefForReceipt) && treatment === 0;
        const deferredMultiSession = r.omitTreatmentAmountsAndAllocations === true;
        return treatment + consultations + travel === 0 && !manualReceiptOnly && !deferredMultiSession;
      }).length,
      unlinkedReceiptsSample: scratch.pendingReceipts
        .filter((r) => {
          const treatment = r.allocations.length;
          const consultations = r.consultationAllocations?.length ?? 0;
          const travel = r.travelAllocations?.length ?? 0;
          const manualReceiptOnly = Boolean(r.explicitClientRefForReceipt) && treatment === 0;
          const deferredMultiSession = r.omitTreatmentAmountsAndAllocations === true;
          return treatment + consultations + travel === 0 && !manualReceiptOnly && !deferredMultiSession;
        })
        .slice(0, 5)
        .map((r) => ({ rowNumber: r.rowNumber, receiptNumber: r.receiptNumber })),
      orgPaymentDiagnosticsSample: scratch.orgPaymentDiagnostics.slice(0, 10),
      travelLinkDiagnosticsSample: scratch.travelLinkDiagnostics.slice(0, 50),
    },
  };
}

export async function analyzeTipulimImport(params: TipulimAnalyzeParams): Promise<TipulimAnalyzeResult> {
  const [job, clients, programsByJob, bankAccounts, digitalMethods] = await Promise.all([
    prisma.jobs.findFirst({
      where: { id: params.jobId, household_id: params.householdId },
      select: { is_private_clinic: true, family_member_id: true, employment_type: true },
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
      select: { id: true, name: true, method_type: true, family_member_id: true },
    }),
  ]);
  const ctx = {
    isPrivateClinic: job?.is_private_clinic ?? true,
    jobFamilyMemberId: job?.family_member_id ?? null,
    jobEmploymentType: job?.employment_type ?? null,
    clients,
    programsByJob,
    bankAccounts,
    digitalMethods,
  };
  const scratch =
    params.profile === "tipulim_org_monthly"
      ? await analyzeOrgProfile(params, ctx)
      : params.profile === "tipulim_receipts_only"
        ? await analyzeReceiptOnlyProfile(params, ctx)
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

async function resolveAppointmentDurationMinutesByProgram(
  tx: PrismaClient,
  params: { householdId: string; jobId: string; programIds: Array<string | null> },
): Promise<{ defaultDuration: number; byProgram: Map<string, number> }> {
  const [settings, job] = await Promise.all([
    tx.therapy_settings.findUnique({
      where: { household_id: params.householdId },
      select: { default_session_length_minutes: true },
    }),
    tx.jobs.findFirst({
      where: { id: params.jobId, household_id: params.householdId },
      select: { default_session_length_minutes: true },
    }),
  ]);
  const uniqueProgramIds = [...new Set(params.programIds.filter((v): v is string => Boolean(v)))];
  const programRows = uniqueProgramIds.length
    ? await tx.therapy_service_programs.findMany({
        where: { household_id: params.householdId, id: { in: uniqueProgramIds } },
        select: { id: true, default_session_length_minutes: true },
      })
    : [];
  const byProgram = new Map<string, number>();
  const defaultDuration =
    resolveSessionDurationMinutes({
      systemDefaultMinutes: getSystemDefaultSessionMinutes(),
      therapySettingsDefaultMinutes: settings?.default_session_length_minutes ?? null,
      jobDefaultMinutes: job?.default_session_length_minutes ?? null,
      programDefaultMinutes: null,
      appointmentDurationMinutes: null,
    }) ?? getSystemDefaultSessionMinutes();
  for (const row of programRows) {
    const resolved =
      resolveSessionDurationMinutes({
        systemDefaultMinutes: getSystemDefaultSessionMinutes(),
        therapySettingsDefaultMinutes: settings?.default_session_length_minutes ?? null,
        jobDefaultMinutes: job?.default_session_length_minutes ?? null,
        programDefaultMinutes: row.default_session_length_minutes ?? null,
        appointmentDurationMinutes: null,
      }) ?? defaultDuration;
    byProgram.set(row.id, resolved);
  }
  return { defaultDuration, byProgram };
}

export async function commitTipulimImport(params: TipulimAnalyzeParams): Promise<TipulimCommitResult> {
  const analysis = await analyzeTipulimImport(params);
  if (analysis.clientConflicts.length > 0 || analysis.blockingErrors.length > 0) {
    return {
      ...analysis,
      created: {
        clients: 0,
        treatments: 0,
        appointments: 0,
        receipts: 0,
        allocations: 0,
        consultationAllocations: 0,
        travelAllocations: 0,
        travel: 0,
        consultations: 0,
        programs: 0,
      },
    };
  }
  const [job, clients, programsByJob, bankAccounts, digitalMethods, consultationTypes] = await Promise.all([
    prisma.jobs.findFirst({
      where: { id: params.jobId, household_id: params.householdId },
      select: { is_private_clinic: true, family_member_id: true, employment_type: true },
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
      select: { id: true, name: true, method_type: true, family_member_id: true },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: params.householdId },
      select: { id: true, name: true, name_he: true },
    }),
  ]);
  const ctx = {
    isPrivateClinic: job?.is_private_clinic ?? true,
    jobFamilyMemberId: job?.family_member_id ?? null,
    jobEmploymentType: job?.employment_type ?? null,
    clients,
    programsByJob,
    bankAccounts,
    digitalMethods,
  };
  const scratch =
    params.profile === "tipulim_org_monthly"
      ? await analyzeOrgProfile(params, ctx)
      : params.profile === "tipulim_receipts_only"
        ? await analyzeReceiptOnlyProfile(params, ctx)
        : await analyzePrivateProfile(params, ctx);
  const duplicateReceiptBlockingErrors: string[] = [];
  if (scratch.pendingReceipts.length > 0) {
    const receiptKeyByImportRow = new Map<string, number[]>();
    for (const r of scratch.pendingReceipts) {
      const key = `${norm(r.receiptNumber).toLowerCase()}|${r.issuedAt.getUTCFullYear()}`;
      const rows = receiptKeyByImportRow.get(key) ?? [];
      rows.push(r.rowNumber);
      receiptKeyByImportRow.set(key, rows);
    }
    for (const [key, rows] of receiptKeyByImportRow.entries()) {
      if (rows.length > 1) {
        const [receiptNumber, year] = key.split("|");
        duplicateReceiptBlockingErrors.push(
          `Import duplicate: receipt #${receiptNumber} for year ${year} appears multiple times (rows ${rows.join(", ")}).`,
        );
      }
    }

    const uniqueReceiptNumbers = Array.from(
      new Set(scratch.pendingReceipts.map((r) => norm(r.receiptNumber)).filter(Boolean)),
    );
    if (uniqueReceiptNumbers.length > 0) {
      const existingReceipts = await prisma.therapy_receipts.findMany({
        where: {
          household_id: params.householdId,
          receipt_number: { in: uniqueReceiptNumbers },
        },
        select: { receipt_number: true, issued_at: true },
      });
      const existingKeySet = new Set(
        existingReceipts.map(
          (r) => `${norm(r.receipt_number).toLowerCase()}|${new Date(r.issued_at).getUTCFullYear()}`,
        ),
      );
      for (const r of scratch.pendingReceipts) {
        const key = `${norm(r.receiptNumber).toLowerCase()}|${r.issuedAt.getUTCFullYear()}`;
        if (existingKeySet.has(key)) {
          duplicateReceiptBlockingErrors.push(
            `Row ${r.rowNumber}: receipt #${r.receiptNumber} for year ${r.issuedAt.getUTCFullYear()} already exists.`,
          );
        }
      }
    }
  }

  const summary = makeSummary(scratch);
  if (duplicateReceiptBlockingErrors.length > 0) {
    summary.blockingErrors = [...summary.blockingErrors, ...duplicateReceiptBlockingErrors];
  }
  if (summary.clientConflicts.length > 0 || summary.blockingErrors.length > 0) {
    return {
      ...summary,
      created: {
        clients: 0,
        treatments: 0,
        appointments: 0,
        receipts: 0,
        allocations: 0,
        consultationAllocations: 0,
        travelAllocations: 0,
        travel: 0,
        consultations: 0,
        programs: 0,
      },
    };
  }

  const linkDiagnostics = {
    allocationsMissingTreatmentKey: 0,
    markPaidMissingTreatmentKey: 0,
    missingTreatmentKeys: new Set<string>(),
  };
  const created = await prisma.$transaction(async (tx) => {
    const createdCount = {
      clients: 0,
      treatments: 0,
      appointments: 0,
      receipts: 0,
      allocations: 0,
      consultationAllocations: 0,
      travelAllocations: 0,
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
    const preferredProgramByClient = new Map<string, { programId: string; occurredAtMs: number }>();
    const treatmentRows: Array<{
      id: string;
      key: string;
      household_id: string;
      client_id: string;
      job_id: string;
      program_id: string | null;
      occurred_at: Date;
      amount: string | number | null;
      currency: string;
      visit_type: "clinic" | "home" | "phone" | "video";
      note_1: string | null;
      payment_date: Date | null;
      payment_method: "bank_transfer" | "digital_payment" | null;
      payment_bank_account_id: string | null;
      payment_digital_payment_method_id: string | null;
    }> = [];
    for (const t of scratch.pendingTreatments.values()) {
      const clientId =
        t.clientRef.kind === "existing" ? t.clientRef.id : clientIdByKey.get(t.clientRef.tempKey) ?? null;
      if (!clientId) continue;
      const defaultProg = programMap.get("__default__") ?? null;
      const programIdForRow = t.programName
        ? (programMap.get(norm(t.programName)) ?? defaultProg)
        : defaultProg;
      const treatmentId = crypto.randomUUID();
      treatmentRows.push({
        id: treatmentId,
        key: t.key,
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
      });
      treatmentIdByKey.set(t.key, treatmentId);
      if (programIdForRow) {
        const occurredAtMs = t.occurredAt.getTime();
        const existingPreferred = preferredProgramByClient.get(clientId);
        if (!existingPreferred || occurredAtMs >= existingPreferred.occurredAtMs) {
          preferredProgramByClient.set(clientId, { programId: programIdForRow, occurredAtMs });
        }
      }
    }
    if (treatmentRows.length > 0) {
      await tx.therapy_treatments.createMany({
        data: treatmentRows.map(({ key: _key, ...row }) => row),
      });
      createdCount.treatments += treatmentRows.length;
    }
    if (params.createCompletedAppointments && treatmentRows.length > 0) {
      const durationDefaults = await resolveAppointmentDurationMinutesByProgram(tx as unknown as PrismaClient, {
        householdId: params.householdId,
        jobId: params.jobId,
        programIds: treatmentRows.map((row) => row.program_id),
      });
      const uniqueClientIds = [...new Set(treatmentRows.map((row) => row.client_id))];
      const clientRows = await tx.therapy_clients.findMany({
        where: { household_id: params.householdId, id: { in: uniqueClientIds } },
        select: { id: true, family_id: true },
      });
      const familyByClientId = new Map(clientRows.map((row) => [row.id, row.family_id] as const));
      const appointmentRows = treatmentRows.map((row) => {
        const duration =
          (row.program_id ? durationDefaults.byProgram.get(row.program_id) : null) ?? durationDefaults.defaultDuration;
        const endAt = new Date(row.occurred_at.getTime() + duration * 60 * 1000);
        return {
          id: crypto.randomUUID(),
          household_id: params.householdId,
          client_id: row.client_id,
          family_id: familyByClientId.get(row.client_id) ?? null,
          job_id: params.jobId,
          program_id: row.program_id,
          visit_type: row.visit_type,
          start_at: row.occurred_at,
          end_at: endAt,
          duration_minutes: duration,
          status: "completed" as const,
          treatment_id: row.id,
        };
      });
      await tx.therapy_appointments.createMany({ data: appointmentRows });
      const appointmentParticipantRows = appointmentRows.map((row) => ({
        id: crypto.randomUUID(),
        household_id: params.householdId,
        appointment_id: row.id,
        client_id: row.client_id,
      }));
      await tx.therapy_appointment_participants.createMany({
        data: appointmentParticipantRows,
        skipDuplicates: true,
      });
      createdCount.appointments += appointmentRows.length;
    }

    const consultationTypeIdByName = new Map<string, string>();
    const consultationIdByKey = new Map<string, string>();
    const consultationRows: Array<{
      id: string;
      key: string;
      household_id: string;
      job_id: string;
      consultation_type_id: string;
      occurred_at: Date;
      amount: string | number;
      currency: string;
      income_amount: string | number;
      income_currency: string;
      notes: string | null;
    }> = [];
    const consultationParticipantRows: Array<{
      id: string;
      household_id: string;
      consultation_id: string;
      client_id: string;
    }> = [];
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
      const consultationId = crypto.randomUUID();
      consultationRows.push({
        id: consultationId,
        key: c.key,
        household_id: params.householdId,
        job_id: params.jobId,
        consultation_type_id: typeId,
        occurred_at: c.occurredAt,
        amount: c.amount,
        currency: "ILS",
        income_amount: c.amount,
        income_currency: "ILS",
        notes: c.note,
      });
      consultationIdByKey.set(c.key, consultationId);
      const consultationClientId =
        c.clientRef?.kind === "existing"
          ? c.clientRef.id
          : c.clientRef?.kind === "new"
            ? clientIdByKey.get(c.clientRef.tempKey) ?? null
            : null;
      if (consultationClientId) {
        consultationParticipantRows.push({
          id: crypto.randomUUID(),
          household_id: params.householdId,
          consultation_id: consultationId,
          client_id: consultationClientId,
        });
      }
    }
    if (consultationRows.length > 0) {
      await tx.therapy_consultations.createMany({
        data: consultationRows.map(({ key: _key, ...row }) => row),
      });
      createdCount.consultations += consultationRows.length;
    }
    if (consultationParticipantRows.length > 0) {
      await tx.therapy_consultation_participants.createMany({
        data: consultationParticipantRows,
        skipDuplicates: true,
      });
    }

    const travelIdByKey = new Map<string, string>();
    const travelClientDateNeeds: Array<{ clientId: string; occurredAt: Date }> = [];
    for (const tr of scratch.pendingTravel) {
      if (!tr.clientRef || !tr.occurredAt) continue;
      const clientId =
        tr.clientRef.kind === "existing" ? tr.clientRef.id : clientIdByKey.get(tr.clientRef.tempKey) ?? null;
      if (!clientId) continue;
      travelClientDateNeeds.push({ clientId, occurredAt: tr.occurredAt });
    }
    const treatmentRowsByClientDate = new Map<
      string,
      Array<{ id: string; visit_type: "clinic" | "home" | "phone" | "video" }>
    >();
    if (travelClientDateNeeds.length > 0) {
      const uniqueClientIds = [...new Set(travelClientDateNeeds.map((n) => n.clientId))];
      let minOccurredAt = travelClientDateNeeds[0].occurredAt;
      let maxOccurredAt = travelClientDateNeeds[0].occurredAt;
      for (const need of travelClientDateNeeds) {
        if (need.occurredAt < minOccurredAt) minOccurredAt = need.occurredAt;
        if (need.occurredAt > maxOccurredAt) maxOccurredAt = need.occurredAt;
      }
      const dbTreatmentRows = await tx.therapy_treatments.findMany({
        where: {
          household_id: params.householdId,
          job_id: params.jobId,
          client_id: { in: uniqueClientIds },
          occurred_at: {
            gte: new Date(Date.UTC(minOccurredAt.getUTCFullYear(), minOccurredAt.getUTCMonth(), minOccurredAt.getUTCDate(), 0, 0, 0)),
            lte: new Date(Date.UTC(maxOccurredAt.getUTCFullYear(), maxOccurredAt.getUTCMonth(), maxOccurredAt.getUTCDate(), 23, 59, 59, 999)),
          },
        },
        select: { id: true, client_id: true, occurred_at: true, visit_type: true },
      });
      for (const tr of dbTreatmentRows) {
        const key = `${tr.client_id}|${monthKey(tr.occurred_at)}`;
        const arr = treatmentRowsByClientDate.get(key) ?? [];
        arr.push({ id: tr.id, visit_type: tr.visit_type });
        treatmentRowsByClientDate.set(key, arr);
      }
    }
    const travelRows: Array<{
      id: string;
      key: string;
      household_id: string;
      job_id: string;
      treatment_id: string | null;
      occurred_at: Date;
      amount: string | number;
      currency: string;
      notes: string | null;
    }> = [];
    for (const tr of scratch.pendingTravel) {
      if (!tr.occurredAt) continue;
      if (tr.amount == null) continue;
      let treatmentId: string | null = tr.treatmentKey ? treatmentIdByKey.get(tr.treatmentKey) ?? null : null;
      if (!treatmentId && tr.clientRef) {
        const clientId =
          tr.clientRef.kind === "existing" ? tr.clientRef.id : clientIdByKey.get(tr.clientRef.tempKey) ?? null;
        if (clientId) {
          const candidates = treatmentRowsByClientDate.get(`${clientId}|${monthKey(tr.occurredAt)}`) ?? [];
          if (candidates.length > 0) {
            const preferred = candidates.find((c) => c.visit_type === "home") ?? candidates[0];
            treatmentId = preferred?.id ?? null;
          }
        }
      }
      const travelId = crypto.randomUUID();
      travelRows.push({
        id: travelId,
        key: tr.key,
        household_id: params.householdId,
        job_id: params.jobId,
        treatment_id: treatmentId,
        occurred_at: tr.occurredAt,
        amount: tr.amount,
        currency: "ILS",
        notes: tr.note,
      });
      travelIdByKey.set(tr.key, travelId);
    }
    if (travelRows.length > 0) {
      await tx.therapy_travel_entries.createMany({
        data: travelRows.map(({ key: _key, ...row }) => row),
      });
      createdCount.travel += travelRows.length;
    }

    const clientIdByTreatmentId = new Map<string, string>();
    for (const tr of treatmentRows) {
      clientIdByTreatmentId.set(tr.id, tr.client_id);
    }
    const explicitReceiptClientIds: string[] = [];
    for (const pr of scratch.pendingReceipts) {
      const ref = pr.explicitClientRefForReceipt;
      if (!ref) continue;
      const cid =
        ref.kind === "existing" ? ref.id : clientIdByKey.get(ref.tempKey) ?? null;
      if (cid) explicitReceiptClientIds.push(cid);
    }
    const distinctTreatmentClientIds = [...new Set(treatmentRows.map((t) => t.client_id))];
    const allClientIdsForFamily = [
      ...new Set([...distinctTreatmentClientIds, ...explicitReceiptClientIds]),
    ];
    const familyByClientId = new Map<string, string | null>();
    if (allClientIdsForFamily.length > 0) {
      const clientRows = await tx.therapy_clients.findMany({
        where: { household_id: params.householdId, id: { in: allClientIdsForFamily } },
        select: { id: true, family_id: true },
      });
      for (const cr of clientRows) {
        familyByClientId.set(cr.id, cr.family_id);
      }
    }

    const receiptRows: Array<{
      id: string;
      row: (typeof scratch.pendingReceipts extends Array<infer U> ? U : never);
      data: {
        id: string;
        household_id: string;
        job_id: string;
        client_id: string | null;
        family_id: string | null;
        receipt_number: string;
        issued_at: Date;
        total_amount: string | number;
        net_amount: string | number;
        receipt_kind: "regular" | "salary_fictitious";
        currency: string;
        recipient_type: "client" | "organization";
        payment_method: "cash" | "bank_transfer" | "digital_card" | "credit_card";
        covered_period_start: Date | null;
        covered_period_end: Date | null;
        notes: string | null;
      };
    }> = [];
    for (const r of scratch.pendingReceipts) {
      const receiptId = crypto.randomUUID();
      const clientIdsFromTreatments = new Set<string>();
      for (const a of r.allocations) {
        const treatmentId = treatmentIdByKey.get(a.treatmentKey);
        if (!treatmentId) continue;
        const cid = clientIdByTreatmentId.get(treatmentId);
        if (cid) clientIdsFromTreatments.add(cid);
      }
      const uniqueClients = [...clientIdsFromTreatments];
      let resolved_client_id: string | null = null;
      let resolved_family_id: string | null = null;
      if (uniqueClients.length === 1) {
        resolved_client_id = uniqueClients[0]!;
        resolved_family_id = familyByClientId.get(resolved_client_id) ?? null;
      } else if (r.recipientType === "client" && uniqueClients.length > 1) {
        resolved_client_id = uniqueClients[0]!;
        resolved_family_id = familyByClientId.get(resolved_client_id) ?? null;
      } else if (uniqueClients.length === 0 && r.explicitClientRefForReceipt) {
        const ref = r.explicitClientRefForReceipt;
        const cid =
          ref.kind === "existing" ? ref.id : clientIdByKey.get(ref.tempKey) ?? null;
        if (cid) {
          resolved_client_id = cid;
          resolved_family_id = familyByClientId.get(cid) ?? null;
        }
      }
      receiptRows.push({
        id: receiptId,
        row: r,
        data: {
          id: receiptId,
          household_id: params.householdId,
          job_id: params.jobId,
          client_id: resolved_client_id,
          family_id: resolved_family_id,
          receipt_number: r.receiptNumber,
          issued_at: r.issuedAt,
          total_amount: r.totalAmount,
          net_amount: r.netAmount ?? r.totalAmount,
          receipt_kind: r.receiptKind ?? defaultReceiptKindForJobEmploymentType(ctx.jobEmploymentType),
          currency: "ILS",
          recipient_type: r.recipientType,
          payment_method: r.paymentMethod,
          covered_period_start: r.coveredPeriodStart ?? null,
          covered_period_end: r.coveredPeriodEnd ?? null,
          notes: r.notes,
        },
      });
    }
    if (receiptRows.length > 0) {
      await tx.therapy_receipts.createMany({
        data: receiptRows.map((r) => r.data),
      });
      createdCount.receipts += receiptRows.length;
    }

    const receiptAllocationRows: Array<{
      id: string;
      household_id: string;
      receipt_id: string;
      treatment_id: string;
      amount: string | number;
    }> = [];
    const receiptConsultationAllocationRows: Array<{
      id: string;
      household_id: string;
      receipt_id: string;
      consultation_id: string;
      amount: string | number;
    }> = [];
    const receiptTravelAllocationRows: Array<{
      id: string;
      household_id: string;
      receipt_id: string;
      travel_entry_id: string;
      amount: string | number;
    }> = [];
    const markPaidGroups = new Map<
      string,
      {
        treatmentIds: string[];
        paymentDate: Date;
        paymentMethod: "bank_transfer" | "digital_payment" | null;
        paymentBankAccountId: string | null;
        paymentDigitalMethodId: string | null;
      }
    >();
    for (const receiptEntry of receiptRows) {
      const r = receiptEntry.row;
      for (const a of r.allocations) {
        const treatmentId = treatmentIdByKey.get(a.treatmentKey);
        if (!treatmentId) {
          linkDiagnostics.allocationsMissingTreatmentKey += 1;
          if (linkDiagnostics.missingTreatmentKeys.size < 20) linkDiagnostics.missingTreatmentKeys.add(a.treatmentKey);
          continue;
        }
        receiptAllocationRows.push({
          id: crypto.randomUUID(),
          household_id: params.householdId,
          receipt_id: receiptEntry.id,
          treatment_id: treatmentId,
          amount: a.amount,
        });
      }
      for (const a of r.consultationAllocations ?? []) {
        const consultationId = consultationIdByKey.get(a.consultationKey);
        if (!consultationId) continue;
        receiptConsultationAllocationRows.push({
          id: crypto.randomUUID(),
          household_id: params.householdId,
          receipt_id: receiptEntry.id,
          consultation_id: consultationId,
          amount: a.amount,
        });
      }
      for (const a of r.travelAllocations ?? []) {
        const travelId = travelIdByKey.get(a.travelKey);
        if (!travelId) continue;
        receiptTravelAllocationRows.push({
          id: crypto.randomUUID(),
          household_id: params.householdId,
          receipt_id: receiptEntry.id,
          travel_entry_id: travelId,
          amount: a.amount,
        });
      }
      if (r.treatmentKeysToMarkPaid && r.treatmentKeysToMarkPaid.length > 0) {
        const groupKey = [
          r.issuedAt.toISOString(),
          r.treatmentPaymentMethod ?? "",
          r.treatmentBankAccountId ?? "",
          r.treatmentDigitalMethodId ?? "",
        ].join("|");
        const group =
          markPaidGroups.get(groupKey) ?? {
            treatmentIds: [],
            paymentDate: r.issuedAt,
            paymentMethod: r.treatmentPaymentMethod ?? null,
            paymentBankAccountId: r.treatmentBankAccountId ?? null,
            paymentDigitalMethodId: r.treatmentDigitalMethodId ?? null,
          };
        for (const tKey of r.treatmentKeysToMarkPaid) {
          const treatmentId = treatmentIdByKey.get(tKey);
          if (!treatmentId) {
            linkDiagnostics.markPaidMissingTreatmentKey += 1;
            if (linkDiagnostics.missingTreatmentKeys.size < 20) linkDiagnostics.missingTreatmentKeys.add(tKey);
            continue;
          }
          group.treatmentIds.push(treatmentId);
        }
        markPaidGroups.set(groupKey, group);
      }
    }
    if (receiptAllocationRows.length > 0) {
      await tx.therapy_receipt_allocations.createMany({ data: receiptAllocationRows });
      createdCount.allocations += receiptAllocationRows.length;
    }
    if (receiptConsultationAllocationRows.length > 0) {
      await tx.therapy_receipt_consultation_allocations.createMany({ data: receiptConsultationAllocationRows });
      createdCount.consultationAllocations += receiptConsultationAllocationRows.length;
    }
    if (receiptTravelAllocationRows.length > 0) {
      await tx.therapy_receipt_travel_allocations.createMany({ data: receiptTravelAllocationRows });
      createdCount.travelAllocations += receiptTravelAllocationRows.length;
    }
    for (const group of markPaidGroups.values()) {
      if (group.treatmentIds.length === 0) continue;
      await tx.therapy_treatments.updateMany({
        where: { id: { in: group.treatmentIds } },
        data: {
          payment_date: group.paymentDate,
          payment_method: group.paymentMethod,
          payment_bank_account_id: group.paymentBankAccountId,
          payment_digital_payment_method_id: group.paymentDigitalMethodId,
        },
      });
    }

    const touchedClientIds = new Set<string>();
    const visitCountsByClientId = new Map<string, Map<"clinic" | "home" | "phone" | "video", number>>();
    for (const t of scratch.pendingTreatments.values()) {
      const clientId =
        t.clientRef.kind === "existing" ? t.clientRef.id : clientIdByKey.get(t.clientRef.tempKey) ?? null;
      if (clientId) {
        touchedClientIds.add(clientId);
        const counts = visitCountsByClientId.get(clientId) ?? new Map();
        counts.set(t.visitType, (counts.get(t.visitType) ?? 0) + 1);
        visitCountsByClientId.set(clientId, counts);
      }
    }
    const now = new Date();
    const twoMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, now.getUTCDate()));
    function utcDay(d: Date): Date {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    const touchedIds = Array.from(touchedClientIds);
    const treatmentBoundsByClient = new Map<string, { min: Date | null; max: Date | null }>();
    if (touchedIds.length > 0) {
      const groupedBounds = await tx.therapy_treatments.groupBy({
        by: ["client_id"],
        where: {
          household_id: params.householdId,
          job_id: params.jobId,
          client_id: { in: touchedIds },
        },
        _min: { occurred_at: true },
        _max: { occurred_at: true },
      });
      for (const row of groupedBounds) {
        treatmentBoundsByClient.set(row.client_id, {
          min: row._min.occurred_at ?? null,
          max: row._max.occurred_at ?? null,
        });
      }
    }
    const existingClients = touchedIds.length
      ? await tx.therapy_clients.findMany({
          where: { id: { in: touchedIds } },
          select: { id: true, start_date: true, default_program_id: true },
        })
      : [];
    const existingClientById = new Map(existingClients.map((c) => [c.id, c] as const));
    for (const clientId of touchedIds) {
      const bounds = treatmentBoundsByClient.get(clientId);
      if (!bounds?.min || !bounds.max) continue;
      const earliestOcc = utcDay(bounds.min);
      let newStart = earliestOcc;
      const existingClient = existingClientById.get(clientId);
      const existingStart = existingClient?.start_date ?? null;
      if (existingStart) {
        const ex = utcDay(existingStart);
        newStart = new Date(Math.min(ex.getTime(), earliestOcc.getTime()));
      }
      const lastDay = utcDay(bounds.max);
      const recent = bounds.max.getTime() >= twoMonthsAgo.getTime();
      const preferredProgramId =
        preferredProgramByClient.get(clientId)?.programId ?? existingClient?.default_program_id ?? null;
      const visitCounts = visitCountsByClientId.get(clientId) ?? new Map();
      const visitPriority: Array<"clinic" | "home" | "phone" | "video"> = ["clinic", "home", "phone", "video"];
      let majorityVisitType: "clinic" | "home" | "phone" | "video" | null = null;
      let maxCount = 0;
      for (const vt of visitPriority) {
        const vtCount = visitCounts.get(vt) ?? 0;
        if (vtCount > maxCount) {
          maxCount = vtCount;
          majorityVisitType = vt;
        }
      }
      await tx.therapy_clients.update({
        where: { id: clientId },
        data: {
          default_job_id: params.jobId,
          default_program_id: preferredProgramId,
          default_visit_type: majorityVisitType,
          start_date: newStart,
          end_date: recent ? null : lastDay,
          is_active: recent,
        },
      });
    }

    return createdCount;
  }, {
    // Large monthly imports can exceed Prisma's default interactive transaction timeout (5s).
    // Give enough headroom for very large workbooks and slower DBs (prior 120s was hit).
    maxWait: 30_000,
    timeout: 600_000,
  });

  return {
    ...summary,
    created,
    importDebug: {
      ...(summary.importDebug ?? {
        unlinkedReceiptsCount: 0,
        unlinkedReceiptsSample: [],
      }),
      commitLinkDiagnostics: {
        allocationsMissingTreatmentKey: linkDiagnostics.allocationsMissingTreatmentKey,
        markPaidMissingTreatmentKey: linkDiagnostics.markPaidMissingTreatmentKey,
        missingTreatmentKeysSample: Array.from(linkDiagnostics.missingTreatmentKeys).slice(0, 10),
      },
    },
  };
}

