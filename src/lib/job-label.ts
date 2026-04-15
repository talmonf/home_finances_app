/**
 * Standard job label: role (job title) with optional organization in parentheses.
 */
export function formatJobDisplayLabel(job: {
  job_title: string;
  employer_name: string | null | undefined;
}): string {
  const org = job.employer_name?.trim();
  return org ? `${job.job_title} (${org})` : job.job_title;
}
