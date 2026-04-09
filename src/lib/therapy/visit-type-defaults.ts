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
