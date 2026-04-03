export type TherapyPaymentStatus = "unpaid" | "partial" | "paid";

export function decimalToNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as { toNumber(): number }).toNumber();
  }
  return Number(v);
}

export function treatmentPaymentStatus(
  treatmentAmount: unknown,
  allocatedSum: unknown,
): TherapyPaymentStatus {
  const t =
    typeof treatmentAmount === "object" && treatmentAmount !== null && "toNumber" in treatmentAmount
      ? (treatmentAmount as { toNumber(): number }).toNumber()
      : Number(treatmentAmount);
  const a =
    typeof allocatedSum === "object" && allocatedSum !== null && "toNumber" in allocatedSum
      ? (allocatedSum as { toNumber(): number }).toNumber()
      : Number(allocatedSum);
  if (!Number.isFinite(t) || t <= 0) return "unpaid";
  if (a <= 0) return "unpaid";
  if (a + 1e-9 >= t) return "paid";
  return "partial";
}
