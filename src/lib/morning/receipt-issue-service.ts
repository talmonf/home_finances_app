import { prisma } from "@/lib/auth";
import { uploadTherapyReceiptDocument } from "@/lib/object-storage";
import {
  issueMorningReceipt,
  formatMorningError,
  type ReceiptIncomeLine,
} from "@/lib/morning";
import {
  decryptMorningCredentials,
  getJobMorningIntegration,
} from "@/lib/morning/integration";

export async function buildReceiptIncomeLines(
  householdId: string,
  receiptId: string,
): Promise<ReceiptIncomeLine[]> {
  const [treatmentAllocations, consultationAllocations, travelAllocations] = await Promise.all([
    prisma.therapy_receipt_allocations.findMany({
      where: { household_id: householdId, receipt_id: receiptId },
      include: {
        treatment: {
          select: { occurred_at: true, amount: true },
        },
      },
    }),
    prisma.therapy_receipt_consultation_allocations.findMany({
      where: { household_id: householdId, receipt_id: receiptId },
      include: {
        consultation: {
          select: { occurred_at: true, amount: true, income_amount: true },
        },
      },
    }),
    prisma.therapy_receipt_travel_allocations.findMany({
      where: { household_id: householdId, receipt_id: receiptId },
      include: {
        travel_entry: {
          select: { occurred_at: true, amount: true },
        },
      },
    }),
  ]);

  const lines: ReceiptIncomeLine[] = [];

  for (const row of treatmentAllocations) {
    const date = row.treatment.occurred_at.toISOString().slice(0, 10);
    lines.push({
      description: `טיפול ${date}`,
      amount: Number(row.amount.toString()),
    });
  }
  for (const row of consultationAllocations) {
    const date = row.consultation.occurred_at.toISOString().slice(0, 10);
    const amount = Number((row.amount ?? row.consultation.amount ?? row.consultation.income_amount ?? 0).toString());
    lines.push({
      description: `ייעוץ ${date}`,
      amount: Number(row.amount.toString()) || amount,
    });
  }
  for (const row of travelAllocations) {
    const date = row.travel_entry.occurred_at?.toISOString().slice(0, 10) ?? "";
    lines.push({
      description: `נסיעה ${date}`,
      amount: Number(row.amount.toString()),
    });
  }

  return lines;
}

export async function issueTherapyReceiptViaMorning(
  householdId: string,
  receiptId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const receipt = await prisma.therapy_receipts.findFirst({
    where: { id: receiptId, household_id: householdId },
  });
  if (!receipt) return { ok: false, error: "Receipt not found" };
  if (receipt.morning_document_id) return { ok: true };
  if (receipt.recipient_type !== "client" || !receipt.client_id) {
    return { ok: false, error: "Morning receipts require a client recipient" };
  }

  const integration = await getJobMorningIntegration(householdId, receipt.job_id);
  if (!integration?.enabled) return { ok: false, error: "Morning integration is not enabled" };
  const creds = decryptMorningCredentials(integration);
  if (!creds) return { ok: false, error: "Morning credentials are missing or invalid" };

  const client = await prisma.therapy_clients.findFirst({
    where: { id: receipt.client_id, household_id: householdId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      id_number: true,
      email: true,
      phones: true,
      address: true,
      morning_client_id: true,
    },
  });
  if (!client) return { ok: false, error: "Client not found" };

  try {
    const incomeLines = await buildReceiptIncomeLines(householdId, receiptId);
    const vatExempt = true;
    const result = await issueMorningReceipt(
      creds,
      {
        id: receipt.id,
        issued_at: receipt.issued_at,
        payment_date: receipt.payment_date,
        total_amount: receipt.total_amount,
        net_amount: receipt.net_amount,
        currency: receipt.currency,
        payment_method: receipt.payment_method,
        notes: receipt.notes,
        covered_period_start: receipt.covered_period_start,
        covered_period_end: receipt.covered_period_end,
      },
      client,
      incomeLines,
      integration.default_document_type,
      vatExempt,
    );

    const uploaded = await uploadTherapyReceiptDocument(
      householdId,
      receiptId,
      "application/pdf",
      result.pdfBuffer,
    );

    await prisma.$transaction(async (tx) => {
      await tx.therapy_clients.update({
        where: { id: client.id },
        data: { morning_client_id: result.morningClientId },
      });
      await tx.therapy_receipts.update({
        where: { id: receiptId },
        data: {
          receipt_number: result.receiptNumber,
          receipt_number_source: "morning",
          morning_document_id: result.documentId,
          morning_issued_at: new Date(),
          morning_issue_status: "issued",
          morning_issue_error: null,
          document_file_name: "receipt.pdf",
          document_mime_type: "application/pdf",
          document_storage_bucket: uploaded.bucket,
          document_storage_key: uploaded.key,
          document_uploaded_at: new Date(),
        },
      });

      const treatmentIds = await tx.therapy_receipt_allocations.findMany({
        where: { receipt_id: receiptId },
        select: { treatment_id: true },
      });
      if (treatmentIds.length > 0) {
        await tx.therapy_treatments.updateMany({
          where: { id: { in: treatmentIds.map((t) => t.treatment_id) } },
          data: { reported_to_external_system: true },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    const error = formatMorningError(err);
    await prisma.therapy_receipts.update({
      where: { id: receiptId },
      data: {
        morning_issue_status: "failed",
        morning_issue_error: error,
      },
    });
    return { ok: false, error };
  }
}
