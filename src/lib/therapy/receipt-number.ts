import { prisma } from "@/lib/auth";

const PENDING_PREFIX = "PENDING-";

export function isPendingReceiptNumber(receiptNumber: string): boolean {
  return receiptNumber.trim().toUpperCase().startsWith(PENDING_PREFIX);
}

export function makePendingReceiptNumber(receiptId: string): string {
  return `${PENDING_PREFIX}${receiptId.slice(0, 8).toUpperCase()}`;
}

function issuedAtCalendarYear(issuedAt: Date): number {
  return issuedAt.getUTCFullYear();
}

function yearBoundsUtc(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export async function findConflictingReceiptNumber(
  householdId: string,
  receiptNumber: string,
  issuedAt: Date,
  excludeReceiptId?: string,
): Promise<{ id: string; receipt_number: string } | null> {
  const normalized = receiptNumber.trim();
  if (!normalized || isPendingReceiptNumber(normalized)) {
    return null;
  }

  const year = issuedAtCalendarYear(issuedAt);
  const { start, end } = yearBoundsUtc(year);

  return prisma.therapy_receipts.findFirst({
    where: {
      household_id: householdId,
      receipt_number: normalized,
      issued_at: { gte: start, lt: end },
      ...(excludeReceiptId ? { id: { not: excludeReceiptId } } : {}),
    },
    select: { id: true, receipt_number: true },
  });
}

export async function assertReceiptNumberAvailable(
  householdId: string,
  receiptNumber: string,
  issuedAt: Date,
  excludeReceiptId?: string,
): Promise<{ ok: true } | { ok: false; year: number; receiptNumber: string }> {
  const conflict = await findConflictingReceiptNumber(
    householdId,
    receiptNumber,
    issuedAt,
    excludeReceiptId,
  );
  if (!conflict) return { ok: true };
  return {
    ok: false,
    year: issuedAtCalendarYear(issuedAt),
    receiptNumber: conflict.receipt_number,
  };
}
