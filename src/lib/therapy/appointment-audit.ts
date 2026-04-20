import { prisma } from "@/lib/auth";
import type { TherapyAppointmentAuditAction } from "@/generated/prisma/enums";

export type AppointmentAuditSnapshot = {
  client_id: string;
  job_id: string;
  client_name: string;
  job_label: string;
  program_name: string | null;
  visit_type: string;
  start_at: string;
  end_at: string | null;
  status: string;
  series_id: string | null;
  family_id: string | null;
  participant_client_ids: string[];
  participant_names: string[];
  cancellation_reason: string | null;
  reschedule_reason: string | null;
};

export function formatClientNameForAudit(firstName: string, lastName: string | null): string {
  return [firstName, lastName ?? ""].filter(Boolean).join(" ").trim();
}

export function formatJobLabelForAudit(job: { job_title: string; employer_name: string | null }): string {
  return job.employer_name ? `${job.job_title} — ${job.employer_name}` : job.job_title;
}

export function appointmentToSnapshot(row: {
  client_id: string;
  job_id: string;
  start_at: Date;
  end_at: Date | null;
  visit_type: string;
  status: string;
  series_id: string | null;
  family_id: string | null;
  cancellation_reason?: string | null;
  reschedule_reason?: string | null;
  participants?: { client_id: string; client: { first_name: string; last_name: string | null } }[];
  client: { first_name: string; last_name: string | null };
  job: { job_title: string; employer_name: string | null };
  program: { name: string } | null;
}): AppointmentAuditSnapshot {
  return {
    client_id: row.client_id,
    job_id: row.job_id,
    client_name: formatClientNameForAudit(row.client.first_name, row.client.last_name),
    job_label: formatJobLabelForAudit(row.job),
    program_name: row.program?.name ?? null,
    visit_type: row.visit_type,
    start_at: row.start_at.toISOString(),
    end_at: row.end_at ? row.end_at.toISOString() : null,
    status: row.status,
    series_id: row.series_id,
    family_id: row.family_id,
    participant_client_ids: (row.participants ?? []).map((p) => p.client_id),
    participant_names: (row.participants ?? []).map((p) =>
      formatClientNameForAudit(p.client.first_name, p.client.last_name),
    ),
    cancellation_reason: row.cancellation_reason ?? null,
    reschedule_reason: row.reschedule_reason ?? null,
  };
}

export async function logTherapyAppointmentAudit(params: {
  householdId: string;
  userId: string;
  appointmentId: string | null;
  action: TherapyAppointmentAuditAction;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await prisma.therapy_appointment_audits.create({
    data: {
      id: crypto.randomUUID(),
      household_id: params.householdId,
      user_id: params.userId,
      appointment_id: params.appointmentId,
      action: params.action,
      metadata: params.metadata as object,
    },
  });
}
