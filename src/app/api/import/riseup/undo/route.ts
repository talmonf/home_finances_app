import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";

type UndoBody = {
  importAuditId: string;
};

export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as UndoBody;
    if (!body?.importAuditId) {
      return NextResponse.json({ error: "Missing importAuditId" }, { status: 400 });
    }

    const audit = await prisma.riseup_import_audits.findFirst({
      where: {
        id: body.importAuditId,
        household_id: householdId,
      },
      select: { id: true },
    });
    if (!audit) {
      return NextResponse.json({ error: "Import audit not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedLinks = await tx.transaction_entity_links.deleteMany({
        where: {
          household_id: householdId,
          import_audit_id: audit.id,
          source: "riseup_import",
        },
      });
      const undoneProposals = await tx.riseup_import_proposals.updateMany({
        where: {
          household_id: householdId,
          import_audit_id: audit.id,
          status: { in: ["approved", "applied"] },
        },
        data: {
          status: "undone",
          decision_notes:
            "Undo removed RiseUp-owned generic transaction links. Core entities and transactions were left intact for safety.",
        },
      });
      await tx.riseup_import_audits.update({
        where: { id: audit.id },
        data: {
          status: "undone",
        },
      });

      return {
        deletedGenericLinks: deletedLinks.count,
        undoneProposals: undoneProposals.count,
      };
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message:
        "Undo removed import-owned generic links and marked applied proposals undone. Transactions and created entities were not deleted automatically.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Undo failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
