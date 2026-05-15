/**
 * When the clinic has exactly one job in a picker list, use it as the default selection.
 * Pass `undefined` for `explicit` to apply the sole-job default; pass `""` to keep empty.
 */
export function defaultClinicJobId(
  jobs: readonly { id: string }[],
  explicit?: string | null,
): string {
  if (explicit !== undefined && explicit !== null) {
    return explicit.trim();
  }
  return jobs.length === 1 ? jobs[0]!.id : "";
}
