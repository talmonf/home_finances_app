import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { parseExcelBuffer, parsePdfBuffer } from "@/lib/import-parser";
import type { ParsedTransactionRow } from "@/lib/import-parser";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (Vercel default body limit is 4.5MB)

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
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bankAccountId = (formData.get("bank_account_id") as string | null)?.trim() || null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 4 MB." },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    const isExcel =
      name.endsWith(".xlsx") || name.endsWith(".xls");
    const isPdf = name.endsWith(".pdf");
    const isCsv = name.endsWith(".csv");
    if (!isExcel && !isPdf && !isCsv) {
      return NextResponse.json(
        { error: "Only PDF, Excel (.xlsx, .xls), and CSV (.csv) files are supported" },
        { status: 400 }
      );
    }

    if (bankAccountId) {
      const account = await prisma.bank_accounts.findFirst({
        where: { id: bankAccountId, household_id: householdId },
      });
      if (!account) {
        return NextResponse.json({ error: "Invalid bank account" }, { status: 400 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: ParsedTransactionRow[];

    if (isExcel) {
      rows = await parseExcelBuffer(buffer);
    } else if (isPdf) {
      rows = await parsePdfBuffer(buffer);
    } else {
      // CSV: reuse the Excel parser which already does header-based column detection.
      rows = await parseExcelBuffer(buffer);
    }

    const doc = await prisma.documents.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        bank_account_id: bankAccountId,
        file_name: file.name,
        file_type: isExcel ? "excel" : "pdf",
        processing_status: "processing",
      },
    });

    const created: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sr = await prisma.source_records.create({
        data: {
          id: crypto.randomUUID(),
          document_id: doc.id,
          row_index: i,
          raw_date: row.date,
          raw_amount: String(row.amount),
          raw_description: row.description,
          raw_balance: row.rawBalance,
          parsed_date: new Date(row.date),
          parsed_amount: row.amount,
          parsed_direction: row.direction,
        },
      });

      const tx = await prisma.transactions.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          bank_account_id: bankAccountId,
          source_record_id: sr.id,
          document_id: doc.id,
          transaction_date: new Date(row.date),
          amount: row.amount,
          transaction_direction: row.direction,
          description: row.description,
          import_status: "pending_review",
        },
      });
      created.push(tx.id);
    }

    await prisma.documents.updateMany({
      where: { id: doc.id, household_id: householdId },
      data: { processing_status: "completed" },
    });

    return NextResponse.json({
      documentId: doc.id,
      transactionCount: created.length,
    });
  } catch (e) {
    console.error(
      "Import upload error:",
      e instanceof Error ? e.message : "unknown",
    );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
