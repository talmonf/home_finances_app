export type ConsultationTypeDefaultRow = {
  job_id: string;
  program_id: string | null;
  consultation_type_id: string;
  amount: string;
  currency: string;
};

/** Program-specific default wins; otherwise job-level default (program_id null). */
export function resolveConsultationTypeDefault(
  rows: ConsultationTypeDefaultRow[],
  jobId: string,
  programId: string,
  consultationTypeId: string,
): { amount: string; currency: string } | null {
  if (!jobId || !consultationTypeId) return null;
  const programRow = rows.find(
    (r) => r.program_id === programId && r.consultation_type_id === consultationTypeId,
  );
  if (programRow) {
    return { amount: programRow.amount, currency: programRow.currency };
  }
  const jobRow = rows.find(
    (r) =>
      r.program_id === null &&
      r.job_id === jobId &&
      r.consultation_type_id === consultationTypeId,
  );
  if (jobRow) {
    return { amount: jobRow.amount, currency: jobRow.currency };
  }
  return null;
}
