import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/auth";
import {
  IntakeImportKeyConflict,
  type IntakeStore,
  type IntakeTreatmentInsert,
} from "@/lib/therapy/treatment-intake";

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export const prismaTreatmentIntakeStore: IntakeStore = {
  async householdIdForTokenHash(hash) {
    const row = await prisma.therapy_settings.findUnique({
      where: { treatment_intake_token_hash: hash },
      select: { household_id: true },
    });
    return row?.household_id ?? null;
  },
  async activeClients(householdId) {
    return prisma.therapy_clients.findMany({
      where: { household_id: householdId, is_active: true },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        family_id: true,
        default_job_id: true,
        default_program_id: true,
        default_visit_type: true,
        agreed_fee_amount: true,
        agreed_fee_currency: true,
      },
    });
  },
  async job(householdId, jobId) {
    return prisma.jobs.findFirst({
      where: { id: jobId, household_id: householdId },
      select: { id: true, external_reporting_system: true },
    });
  },
  async programCount(householdId, jobId) {
    return prisma.therapy_service_programs.count({
      where: { household_id: householdId, job_id: jobId },
    });
  },
  async programBelongsToJob(householdId, programId, jobId) {
    const row = await prisma.therapy_service_programs.findFirst({
      where: { id: programId, household_id: householdId, job_id: jobId },
      select: { id: true },
    });
    return Boolean(row);
  },
  async visitDefaults(householdId, jobId) {
    const rows = await prisma.therapy_visit_type_default_amounts.findMany({
      where: { household_id: householdId, job_id: jobId },
      select: {
        job_id: true,
        program_id: true,
        visit_type: true,
        amount: true,
        currency: true,
      },
    });
    return rows.map((row) => ({
      job_id: row.job_id,
      program_id: row.program_id,
      visit_type: row.visit_type,
      amount: row.amount.toString(),
      currency: row.currency,
    }));
  },
  async findByImportKey(householdId, importKey) {
    return prisma.therapy_treatments.findFirst({
      where: { household_id: householdId, import_key: importKey },
      select: { id: true },
    });
  },
  async insertTreatment(data: IntakeTreatmentInsert) {
    try {
      return await prisma.therapy_treatments.create({
        data,
        select: { id: true },
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new IntakeImportKeyConflict();
      throw error;
    }
  },
};
