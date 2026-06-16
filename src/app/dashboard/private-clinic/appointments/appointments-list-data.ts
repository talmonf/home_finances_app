import {
  listAppointmentsForHousehold,
  parseAppointmentListStatusFilter,
  sortAppointmentListRows,
  type AppointmentListStatusFilter,
} from "@/lib/therapy/series-occurrences";

export type AppointmentListFilters = {
  status: AppointmentListStatusFilter;
  job: string;
  client: string;
  from: string;
  to: string;
};

function parseDateFilter(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseAppointmentListFilters(sp: {
  status?: string;
  job?: string;
  client?: string;
  from?: string;
  to?: string;
}): AppointmentListFilters {
  return {
    status: parseAppointmentListStatusFilter(sp.status),
    job: sp.job?.trim() || "",
    client: sp.client?.trim() || "",
    from: sp.from?.trim() || "",
    to: sp.to?.trim() || "",
  };
}

export function appointmentsListHasActiveFilters(filters: AppointmentListFilters): boolean {
  return (
    filters.status !== "scheduled" ||
    Boolean(filters.job) ||
    Boolean(filters.client) ||
    Boolean(filters.from) ||
    Boolean(filters.to)
  );
}

export function appointmentsListHref(filters: Partial<AppointmentListFilters> = {}): string {
  const base = "/dashboard/private-clinic/appointments";
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "scheduled") params.set("status", filters.status);
  if (filters.job) params.set("job", filters.job);
  if (filters.client) params.set("client", filters.client);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function loadAppointmentListRows(params: {
  householdId: string;
  jobWhere?: object;
  filters: AppointmentListFilters;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const rows = await listAppointmentsForHousehold({
    householdId: params.householdId,
    jobWhere: params.jobWhere,
    statusFilter: params.filters.status,
    jobId: params.filters.job || undefined,
    clientId: params.filters.client || undefined,
    fromDate: parseDateFilter(params.filters.from),
    toDate: parseDateFilter(params.filters.to),
  });
  return sortAppointmentListRows(rows, now, params.filters.status);
}
