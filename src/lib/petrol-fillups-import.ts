import type { HouseholdDateDisplayFormat } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import * as XLSX from "xlsx";
import { parseFilledAtFromForm } from "@/lib/petrol-fillup-filled-at";

export type ParsedPetrolFillupImportRow = {
  filled_at: Date;
  amount_paid: string;
  litres: string;
  odometer_km: number;
  notes: string | null;
};

function parseMoneyCell(raw: unknown): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

function parseLitresCell(raw: unknown): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed.toFixed(3);
}

function parseOdometerCell(raw: unknown): number | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

/** Excel / sheet serial date → `yyyy-mm-dd` (UTC calendar day). */
function cellToDateInputString(cell: unknown): string {
  if (cell == null || cell === "") return "";
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return cell.toISOString().slice(0, 10);
  }
  if (typeof cell === "number" && Number.isFinite(cell)) {
    const n = cell;
    if (n > 20000 && n < 100000) {
      const epoch = Date.UTC(1899, 11, 30);
      const d = new Date(epoch + Math.round(n * 86400000));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return String(cell).trim();
}

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function resolveColumnIndex(headers: string[], aliases: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const a of aliases) {
    const i = norm.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}

export function matrixFromSpreadsheetBuffer(buffer: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return rows;
}

export function parsePetrolFillupImportMatrix(
  matrix: unknown[][],
  dateFormat: HouseholdDateDisplayFormat,
): { ok: true; rows: ParsedPetrolFillupImportRow[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!matrix.length) {
    return { ok: false, errors: ["The file is empty."] };
  }
  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((h) => String(h ?? "").trim());
  if (!headers.some((h) => h.length > 0)) {
    return { ok: false, errors: ["Missing header row."] };
  }

  const iDate = resolveColumnIndex(headers, ["filled_at", "date", "fill_date"]);
  const iAmount = resolveColumnIndex(headers, ["amount_paid", "amount", "paid"]);
  const iLitres = resolveColumnIndex(headers, ["litres", "liters", "l"]);
  const iOdo = resolveColumnIndex(headers, ["odometer_km", "odometer", "odo", "km"]);
  const iNotes = resolveColumnIndex(headers, ["notes", "note"]);

  if (iDate < 0 || iAmount < 0 || iLitres < 0 || iOdo < 0) {
    return {
      ok: false,
      errors: [
        "Header row must include columns for date, amount, litres, and odometer. Expected names like: filled_at, amount_paid, litres, odometer_km (or date, amount, …).",
      ],
    };
  }

  const rows: ParsedPetrolFillupImportRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const rowLabel = `Row ${r + 1}`;
    if (!line.some((c) => String(c ?? "").trim() !== "")) continue;

    const dateRaw = cellToDateInputString(line[iDate]);
    const amountStr = parseMoneyCell(line[iAmount]);
    const litresStr = parseLitresCell(line[iLitres]);
    const odo = parseOdometerCell(line[iOdo]);
    const notesRaw = iNotes >= 0 ? String(line[iNotes] ?? "").trim() : "";
    const notes = notesRaw ? notesRaw : null;

    const parsedDate = parseFilledAtFromForm(dateRaw, dateFormat);
    const filledAt = parsedDate.ok ? parsedDate.utcDate : null;

    if (!filledAt) {
      errors.push(`${rowLabel}: invalid or missing date.`);
      continue;
    }
    if (!amountStr) {
      errors.push(`${rowLabel}: invalid amount_paid.`);
      continue;
    }
    if (!litresStr) {
      errors.push(`${rowLabel}: invalid litres.`);
      continue;
    }
    if (odo == null) {
      errors.push(`${rowLabel}: invalid odometer_km.`);
      continue;
    }

    rows.push({
      filled_at: filledAt,
      amount_paid: amountStr,
      litres: litresStr,
      odometer_km: odo,
      notes,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  if (rows.length === 0) {
    return { ok: false, errors: ["No data rows found below the header."] };
  }
  return { ok: true, rows };
}

export async function insertPetrolFillupImportRows(
  prisma: PrismaClient,
  householdId: string,
  carId: string,
  rows: ParsedPetrolFillupImportRow[],
): Promise<number> {
  await prisma.car_petrol_fillups.createMany({
    data: rows.map((r) => ({
      id: crypto.randomUUID(),
      household_id: householdId,
      car_id: carId,
      filled_at: r.filled_at,
      amount_paid: r.amount_paid,
      currency: "ILS",
      litres: r.litres,
      odometer_km: r.odometer_km,
      notes: r.notes,
    })),
  });
  return rows.length;
}
