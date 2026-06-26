import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json(
        { error: "Household users only. Sign in as a household member." },
        { status: 403 },
      );
    }

    const riseUpDocuments = await prisma.documents.findMany({
      where: {
        household_id: householdId,
        file_type: "riseup_csv",
      },
      select: { id: true },
    });
    const riseUpDocumentIds = riseUpDocuments.map((d) => d.id);

    const transactions = await prisma.transactions.findMany({
      where: {
        household_id: householdId,
        OR: [
          { riseup_import_key: { not: null } },
          { document_id: { in: riseUpDocumentIds } },
        ],
      },
      select: {
        id: true,
        category_id: true,
        payee_id: true,
        job_id: true,
        subscription_id: true,
        loan_id: true,
        family_member_id: true,
        study_or_class_id: true,
        significant_purchase_id: true,
        rental_id: true,
        trip_id: true,
        car_id: true,
      },
    });

    const transactionIds = transactions.map((t) => t.id);
    const genericLinkCount =
      transactionIds.length === 0
        ? 0
        : await prisma.transaction_entity_links.count({
            where: {
              household_id: householdId,
              transaction_id: { in: transactionIds },
            },
          });
    const proposalCount = await prisma.riseup_import_proposals.count({
      where: {
        household_id: householdId,
        OR: [
          { import_audit_id: { not: null } },
          { status: { in: ["proposed", "approved", "applied"] } },
        ],
      },
    });
    const linkedEntityCount = transactions.filter(
      (t) =>
        t.category_id ||
        t.payee_id ||
        t.job_id ||
        t.subscription_id ||
        t.loan_id ||
        t.family_member_id ||
        t.study_or_class_id ||
        t.significant_purchase_id ||
        t.rental_id ||
        t.trip_id ||
        t.car_id,
    ).length;

    const zero = {
      carPetrolFillups: 0,
      therapyTreatments: 0,
      therapyReceipts: 0,
      therapyJobExpenses: 0,
      therapyConsultations: 0,
      therapyTravelEntries: 0,
    };

    const downstream =
      transactionIds.length === 0
        ? zero
        : {
            carPetrolFillups: await prisma.car_petrol_fillups.count({
              where: { transaction_id: { in: transactionIds } },
            }),
            therapyTreatments: await prisma.therapy_treatments.count({
              where: { linked_transaction_id: { in: transactionIds } },
            }),
            therapyReceipts: await prisma.therapy_receipts.count({
              where: { linked_transaction_id: { in: transactionIds } },
            }),
            therapyJobExpenses: await prisma.therapy_job_expenses.count({
              where: { linked_transaction_id: { in: transactionIds } },
            }),
            therapyConsultations: await prisma.therapy_consultations.count({
              where: {
                OR: [
                  { linked_transaction_id: { in: transactionIds } },
                  { linked_income_transaction_id: { in: transactionIds } },
                  { linked_cost_transaction_id: { in: transactionIds } },
                ],
              },
            }),
            therapyTravelEntries: await prisma.therapy_travel_entries.count({
              where: { linked_transaction_id: { in: transactionIds } },
            }),
          };

    const downstreamCount = Object.values(downstream).reduce((sum, n) => sum + n, 0);

    return NextResponse.json({
      totalRiseUpTransactions: transactions.length,
      enrichedTransactions: linkedEntityCount,
      genericLinkCount,
      proposalCount,
      downstreamLinks: downstream,
      downstreamLinkCount: downstreamCount,
      blocked: downstreamCount > 0,
      message:
        downstreamCount > 0
          ? "Reset is blocked because imported transactions are referenced by downstream records."
          : "Impact check only: no data was changed. A reset would be limited to RiseUp-owned transactions, generic links, and staged proposals.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset preview failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
