import type { TherapyVisitType } from "@/generated/prisma/enums";

export type VisitTypeDefaultRow = {
  job_id: string;
  program_id: string | null;
  visit_type: TherapyVisitType;
  amount: string;
  currency: string;
};

const VISIT_ORDER: TherapyVisitType[] = ["clinic", "home", "phone", "video"];

export function therapyVisitTypesOrdered(): readonly TherapyVisitType[] {
  return VISIT_ORDER;
}

/** Program-specific default wins; otherwise job-level default (program_id null). */
export function resolveTherapyVisitTypeDefault(
  rows: VisitTypeDefaultRow[],
  jobId: string,
  programId: string,
  visitType: TherapyVisitType,
): { amount: string; currency: string } | null {
  const programRow = rows.find(
    (r) => r.program_id === programId && r.visit_type === visitType,
  );
  if (programRow) {
    return { amount: programRow.amount, currency: programRow.currency };
  }
  const jobRow = rows.find(
    (r) => r.program_id === null && r.job_id === jobId && r.visit_type === visitType,
  );
  if (jobRow) {
    return { amount: jobRow.amount, currency: jobRow.currency };
  }
  return null;
}

/** Client agreed fee wins; otherwise the job/program visit-type default. */
export function resolveTreatmentFeePrefill(params: {
  agreedFeeAmount?: string | number | { toString(): string } | null;
  agreedFeeCurrency?: string | null;
  visitDefaults: VisitTypeDefaultRow[];
  jobId: string;
  programId: string | null;
  visitType: TherapyVisitType;
}): { amount: string; currency: string } {
  const agreedAmount =
    params.agreedFeeAmount != null ? String(params.agreedFeeAmount).trim() : "";
  if (agreedAmount !== "") {
    return {
      amount: agreedAmount,
      currency: params.agreedFeeCurrency?.trim() || "ILS",
    };
  }
  const visitDefault = resolveTherapyVisitTypeDefault(
    params.visitDefaults,
    params.jobId,
    params.programId ?? "",
    params.visitType,
  );
  return {
    amount: visitDefault?.amount ?? "",
    currency: visitDefault?.currency ?? "ILS",
  };
}
