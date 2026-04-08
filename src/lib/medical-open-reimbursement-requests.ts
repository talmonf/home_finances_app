import type { MedicalReimbursementSource } from "@/generated/prisma/enums";
import { prisma } from "@/lib/auth";

type ReimbursementRow = {
  kupat_holim_request_submitted_at: Date | null;
  private_insurance_request_submitted_at: Date | null;
  reimbursement_received_at: Date | null;
  reimbursement_source: MedicalReimbursementSource | null;
};

/** One row may contribute 0, 1, or 2 (kupat + private) open requests. */
export function countOpenReimbursementRequestsForRow(row: ReimbursementRow): number {
  let n = 0;
  if (row.kupat_holim_request_submitted_at) {
    const closedByKupatReceipt =
      row.reimbursement_received_at != null && row.reimbursement_source === "kupat_holim";
    if (!closedByKupatReceipt) n += 1;
  }
  if (row.private_insurance_request_submitted_at) {
    const closedByPrivateReceipt =
      row.reimbursement_received_at != null && row.reimbursement_source === "private_insurance";
    if (!closedByPrivateReceipt) n += 1;
  }
  return n;
}

export async function countOpenMedicalReimbursementRequestsForHousehold(
  householdId: string,
): Promise<number> {
  const rows = await prisma.medical_appointments.findMany({
    where: {
      household_id: householdId,
      is_active: true,
      OR: [
        { kupat_holim_request_submitted_at: { not: null } },
        { private_insurance_request_submitted_at: { not: null } },
      ],
    },
    select: {
      kupat_holim_request_submitted_at: true,
      private_insurance_request_submitted_at: true,
      reimbursement_received_at: true,
      reimbursement_source: true,
    },
  });
  return rows.reduce((sum, row) => sum + countOpenReimbursementRequestsForRow(row), 0);
}
