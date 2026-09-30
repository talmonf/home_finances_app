import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/auth";
import { assertReceiptNumberAvailable } from "@/lib/therapy/receipt-number";
import { type ReceiptIntakeInsert, type ReceiptIntakeStore } from "@/lib/therapy/receipt-intake";
import { IntakeImportKeyConflict } from "@/lib/therapy/treatment-intake";
import { prismaTreatmentIntakeStore } from "@/lib/therapy/treatment-intake-store";

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export const prismaReceiptIntakeStore: ReceiptIntakeStore = {
  accountForTokenHash: (hash) => prismaTreatmentIntakeStore.accountForTokenHash(hash),
  activeClients: (householdId, familyMemberId) =>
    prismaTreatmentIntakeStore.activeClients(householdId, familyMemberId),
  job: (householdId, jobId, familyMemberId) =>
    prismaTreatmentIntakeStore.job(householdId, jobId, familyMemberId),
  programCount: (householdId, jobId) => prismaTreatmentIntakeStore.programCount(householdId, jobId),
  programBelongsToJob: (householdId, programId, jobId) =>
    prismaTreatmentIntakeStore.programBelongsToJob(householdId, programId, jobId),
  async findDigitalPaymentMethod(householdId, familyMemberId, name) {
    const rows = await prisma.digital_payment_methods.findMany({
      where: { household_id: householdId, is_active: true },
      select: { id: true, name: true, family_member_id: true },
    });
    const wanted = name.toLocaleLowerCase("en-US");
    const matches = rows.filter((row) => row.name.trim().toLocaleLowerCase("en-US") === wanted);
    return (matches.find((row) => row.family_member_id === familyMemberId) ?? matches[0])?.id ?? null;
  },
  async receiptNumberAvailable(householdId, receiptNumber, issuedAt) {
    const result = await assertReceiptNumberAvailable(householdId, receiptNumber, issuedAt);
    return result.ok;
  },
  async findByImportKey(householdId, importKey) {
    const receipt = await prisma.therapy_receipts.findFirst({
      where: { household_id: householdId, import_key: importKey },
      select: { id: true },
    });
    if (!receipt) return null;
    const treatments = await prisma.therapy_treatments.findMany({
      where: { household_id: householdId, import_key: { startsWith: `${importKey}:` } },
      select: { id: true, import_key: true },
      orderBy: { import_key: "asc" },
    });
    return { id: receipt.id, treatment_ids: treatments.map((row) => row.id) };
  },
  async insertBundle(data: ReceiptIntakeInsert) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.therapy_receipts.create({ data: data.receipt });
        for (const treatment of data.treatments) {
          await tx.therapy_treatments.create({ data: treatment });
        }
        for (const allocation of data.allocations) {
          await tx.therapy_receipt_allocations.create({ data: allocation });
        }
        return { id: data.receipt.id, treatment_ids: data.treatments.map((row) => row.id) };
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new IntakeImportKeyConflict();
      throw error;
    }
  },
};
