import { prisma } from "@/lib/auth";
import {
  PRIVATE_CLINIC_BACKUP_VERSION,
  dryRunRestorePrivateClinicSnapshot,
  parseAndValidateSnapshotText,
  snapshotChecksumSha256,
  type SnapshotPayload,
} from "@/lib/private-clinic/backup-snapshot-format";

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

export async function buildPrivateClinicSnapshot(householdId: string): Promise<{
  payload: SnapshotPayload;
  payloadText: string;
  checksum: string;
}> {
  const data = {
    jobs: await prisma.jobs.findMany({ where: { household_id: householdId, is_private_clinic: true } }),
    therapy_settings: (await prisma.therapy_settings.findUnique({ where: { household_id: householdId } }))
      ? [await prisma.therapy_settings.findUniqueOrThrow({ where: { household_id: householdId } })]
      : [],
    therapy_expense_categories: await prisma.therapy_expense_categories.findMany({ where: { household_id: householdId } }),
    therapy_service_programs: await prisma.therapy_service_programs.findMany({ where: { household_id: householdId } }),
    therapy_clients: await prisma.therapy_clients.findMany({ where: { household_id: householdId } }),
    therapy_families: await prisma.therapy_families.findMany({ where: { household_id: householdId } }),
    therapy_family_members: await prisma.therapy_family_members.findMany({ where: { household_id: householdId } }),
    therapy_client_relationships: await prisma.therapy_client_relationships.findMany({ where: { household_id: householdId } }),
    therapy_clients_jobs: await prisma.therapy_clients_jobs.findMany({ where: { household_id: householdId } }),
    therapy_treatments: await prisma.therapy_treatments.findMany({ where: { household_id: householdId } }),
    therapy_treatment_participants: await prisma.therapy_treatment_participants.findMany({ where: { household_id: householdId } }),
    therapy_treatment_attachments: await prisma.therapy_treatment_attachments.findMany({ where: { household_id: householdId } }),
    therapy_receipts: await prisma.therapy_receipts.findMany({ where: { household_id: householdId } }),
    therapy_receipt_allocations: await prisma.therapy_receipt_allocations.findMany({ where: { household_id: householdId } }),
    therapy_receipt_consultation_allocations: await prisma.therapy_receipt_consultation_allocations.findMany({
      where: { household_id: householdId },
    }),
    therapy_receipt_travel_allocations: await prisma.therapy_receipt_travel_allocations.findMany({
      where: { household_id: householdId },
    }),
    therapy_job_expenses: await prisma.therapy_job_expenses.findMany({ where: { household_id: householdId } }),
    therapy_appointment_series: await prisma.therapy_appointment_series.findMany({ where: { household_id: householdId } }),
    therapy_appointments: await prisma.therapy_appointments.findMany({ where: { household_id: householdId } }),
    therapy_appointment_participants: await prisma.therapy_appointment_participants.findMany({
      where: { household_id: householdId },
    }),
    therapy_consultation_types: await prisma.therapy_consultation_types.findMany({ where: { household_id: householdId } }),
    therapy_consultations: await prisma.therapy_consultations.findMany({ where: { household_id: householdId } }),
    therapy_travel_entries: await prisma.therapy_travel_entries.findMany({ where: { household_id: householdId } }),
    therapy_visit_type_default_amounts: await prisma.therapy_visit_type_default_amounts.findMany({
      where: { household_id: householdId },
    }),
    private_clinic_reminders: await prisma.private_clinic_reminders.findMany({ where: { household_id: householdId } }),
  };

  const payload: SnapshotPayload = {
    manifest: {
      schemaVersion: PRIVATE_CLINIC_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      householdId,
      tables: Object.keys(data),
    },
    data,
  };
  const payloadText = stableJson(payload);
  return { payload, payloadText, checksum: snapshotChecksumSha256(payloadText) };
}
export { parseAndValidateSnapshotText, dryRunRestorePrivateClinicSnapshot };

export async function applyPrivateClinicSnapshot(snapshot: SnapshotPayload, householdId: string) {
  const d = snapshot.data;
  await prisma.$transaction(async (tx) => {
    await tx.therapy_receipt_travel_allocations.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_receipt_consultation_allocations.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_receipt_allocations.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_treatment_participants.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_appointment_participants.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_family_members.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_client_relationships.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_treatment_attachments.deleteMany({ where: { household_id: householdId } });
    await tx.private_clinic_reminders.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_import_audits.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_appointment_audits.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_visit_type_default_amounts.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_travel_entries.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_consultations.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_consultation_types.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_appointments.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_appointment_series.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_job_expenses.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_receipts.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_treatments.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_clients_jobs.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_clients.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_families.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_service_programs.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_expense_categories.deleteMany({ where: { household_id: householdId } });
    await tx.therapy_settings.deleteMany({ where: { household_id: householdId } });
    await tx.jobs.deleteMany({ where: { household_id: householdId, is_private_clinic: true } });

    if (Array.isArray(d.jobs) && d.jobs.length) await tx.jobs.createMany({ data: d.jobs as never[], skipDuplicates: true });
    if (Array.isArray(d.therapy_settings) && d.therapy_settings.length) {
      await tx.therapy_settings.createMany({ data: d.therapy_settings as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_expense_categories) && d.therapy_expense_categories.length) {
      await tx.therapy_expense_categories.createMany({ data: d.therapy_expense_categories as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_service_programs) && d.therapy_service_programs.length) {
      await tx.therapy_service_programs.createMany({ data: d.therapy_service_programs as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_families) && d.therapy_families.length) {
      await tx.therapy_families.createMany({ data: d.therapy_families as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_clients) && d.therapy_clients.length) {
      await tx.therapy_clients.createMany({ data: d.therapy_clients as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_family_members) && d.therapy_family_members.length) {
      await tx.therapy_family_members.createMany({ data: d.therapy_family_members as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_client_relationships) && d.therapy_client_relationships.length) {
      await tx.therapy_client_relationships.createMany({ data: d.therapy_client_relationships as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_clients_jobs) && d.therapy_clients_jobs.length) {
      await tx.therapy_clients_jobs.createMany({ data: d.therapy_clients_jobs as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_treatments) && d.therapy_treatments.length) {
      await tx.therapy_treatments.createMany({ data: d.therapy_treatments as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_treatment_participants) && d.therapy_treatment_participants.length) {
      await tx.therapy_treatment_participants.createMany({
        data: d.therapy_treatment_participants as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.therapy_treatment_attachments) && d.therapy_treatment_attachments.length) {
      await tx.therapy_treatment_attachments.createMany({
        data: d.therapy_treatment_attachments as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.therapy_receipts) && d.therapy_receipts.length) {
      await tx.therapy_receipts.createMany({ data: d.therapy_receipts as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_receipt_allocations) && d.therapy_receipt_allocations.length) {
      await tx.therapy_receipt_allocations.createMany({
        data: d.therapy_receipt_allocations as never[],
        skipDuplicates: true,
      });
    }
    if (
      Array.isArray(d.therapy_receipt_consultation_allocations) &&
      d.therapy_receipt_consultation_allocations.length
    ) {
      await tx.therapy_receipt_consultation_allocations.createMany({
        data: d.therapy_receipt_consultation_allocations as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.therapy_receipt_travel_allocations) && d.therapy_receipt_travel_allocations.length) {
      await tx.therapy_receipt_travel_allocations.createMany({
        data: d.therapy_receipt_travel_allocations as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.therapy_job_expenses) && d.therapy_job_expenses.length) {
      await tx.therapy_job_expenses.createMany({ data: d.therapy_job_expenses as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_appointment_series) && d.therapy_appointment_series.length) {
      await tx.therapy_appointment_series.createMany({
        data: d.therapy_appointment_series as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.therapy_appointments) && d.therapy_appointments.length) {
      await tx.therapy_appointments.createMany({ data: d.therapy_appointments as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_appointment_participants) && d.therapy_appointment_participants.length) {
      await tx.therapy_appointment_participants.createMany({
        data: d.therapy_appointment_participants as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.therapy_consultation_types) && d.therapy_consultation_types.length) {
      await tx.therapy_consultation_types.createMany({
        data: d.therapy_consultation_types as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.therapy_consultations) && d.therapy_consultations.length) {
      await tx.therapy_consultations.createMany({ data: d.therapy_consultations as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_travel_entries) && d.therapy_travel_entries.length) {
      await tx.therapy_travel_entries.createMany({ data: d.therapy_travel_entries as never[], skipDuplicates: true });
    }
    if (Array.isArray(d.therapy_visit_type_default_amounts) && d.therapy_visit_type_default_amounts.length) {
      await tx.therapy_visit_type_default_amounts.createMany({
        data: d.therapy_visit_type_default_amounts as never[],
        skipDuplicates: true,
      });
    }
    if (Array.isArray(d.private_clinic_reminders) && d.private_clinic_reminders.length) {
      await tx.private_clinic_reminders.createMany({
        data: d.private_clinic_reminders as never[],
        skipDuplicates: true,
      });
    }
  });
}
